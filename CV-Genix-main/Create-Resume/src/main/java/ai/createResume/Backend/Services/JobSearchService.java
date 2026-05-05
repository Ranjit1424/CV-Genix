package ai.createResume.Backend.Services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class JobSearchService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String linkedInSearchUrl;
    private final String linkedInApiKey;
    private final String linkedInApiHost;
    private final List<String> excludedTerms;
    private static final Set<String> QUERY_STOP_WORDS = Set.of(
            "and", "or", "for", "with", "the", "a", "an", "to", "in", "on", "at", "of"
    );

    public JobSearchService(
            ObjectMapper objectMapper,
            @Value("${app.jobs.api.base-url:https://remotive.com/api/remote-jobs}") String baseUrl,
            @Value("${app.jobs.linkedin-search.url:https://jsearch.p.rapidapi.com/search}") String linkedInSearchUrl,
            @Value("${app.jobs.linkedin-search.api-key:}") String linkedInApiKey,
            @Value("${app.jobs.linkedin-search.api-host:jsearch.p.rapidapi.com}") String linkedInApiHost,
            @Value("${app.jobs.exclude-keywords:mitre media,jobs@mitremedia.com}") String excludeKeywords
    ) {
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.linkedInSearchUrl = linkedInSearchUrl;
        this.linkedInApiKey = linkedInApiKey;
        this.linkedInApiHost = linkedInApiHost;
        this.excludedTerms = parseExcludedTerms(excludeKeywords);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Cacheable(value = "jobSearch", key = "T(java.util.Objects).hash(#query, #category, #location, #company, #limit)")
    public Map<String, Object> searchJobs(String query, String category, String location, String company, Integer limit)
            throws IOException, InterruptedException {
        String normalizedQuery = clean(query);
        String normalizedCategory = clean(category);
        String normalizedLocation = clean(location);
        String normalizedCompany = clean(company);
        int safeLimit = limit == null ? 20 : Math.max(1, Math.min(limit, 40));

        URI uri = buildUri(normalizedQuery, normalizedCategory, normalizedCompany, safeLimit);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("User-Agent", "ResumeStudio/1.0")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IOException("Job API returned HTTP " + response.statusCode());
        }

        Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {});
        List<Map<String, Object>> remotiveJobs = normalizeJobs(payload, normalizedQuery, normalizedLocation, normalizedCompany);
        List<Map<String, Object>> linkedInJobs = fetchLinkedInJobs(normalizedQuery, normalizedLocation, normalizedCompany, safeLimit);
        List<Map<String, Object>> jobs = mergeJobs(remotiveJobs, linkedInJobs, safeLimit);
        List<Map<String, Object>> trendingCompanies = buildTrendingCompanies(jobs);

        Map<String, Object> result = new HashMap<>();
        result.put("source", linkedInJobs.isEmpty() ? "Remotive" : "Remotive + LinkedIn");
        result.put("query", normalizedQuery);
        result.put("category", normalizedCategory);
        result.put("location", normalizedLocation);
        result.put("company", normalizedCompany);
        result.put("limit", safeLimit);
        result.put("total", jobs.size());
        result.put("upstreamTotal", safeLong(payload.get("job-count")) + linkedInJobs.size());
        result.put("jobs", jobs);
        result.put("trendingCompanies", trendingCompanies);
        result.put("fetchedAt", OffsetDateTime.now().toString());
        result.put(
                "note",
                linkedInJobs.isEmpty()
                        ? "Results come from Remotive's remote jobs board and are refreshed live."
                        : "Results come from Remotive and LinkedIn listings (via configured API) and are refreshed live."
        );
        if (isBlank(linkedInApiKey)) {
            result.put("linkedinNote", "Set app.jobs.linkedin-search.api-key to include LinkedIn jobs and direct apply links.");
        }
        return result;
    }

    private URI buildUri(String query, String category, String company, int limit) {
        List<String> params = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            params.add("search=" + encode(query));
        }
        if (category != null && !category.isBlank() && !"all".equalsIgnoreCase(category)) {
            params.add("category=" + encode(category));
        }
        if (company != null && !company.isBlank()) {
            params.add("company_name=" + encode(company));
        }
        params.add("limit=" + limit);
        String joined = String.join("&", params);
        return URI.create(joined.isBlank() ? baseUrl : baseUrl + "?" + joined);
    }

    private List<Map<String, Object>> normalizeJobs(
            Map<String, Object> payload,
            String query,
            String location,
            String company
    ) {
        Object jobsObject = payload.get("jobs");
        if (!(jobsObject instanceof List<?> jobsList)) {
            return List.of();
        }

        String loweredQuery = lower(query);
        String loweredLocation = lower(location);
        String loweredCompany = lower(company);

        return jobsList.stream()
                .map(this::asMap)
                .filter(Objects::nonNull)
                .map(job -> normalizeJob(job, loweredQuery, loweredLocation, loweredCompany))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private Map<String, Object> normalizeJob(
            Map<String, Object> job,
            String loweredQuery,
            String loweredLocation,
            String loweredCompany
    ) {
        String title = clean(job.get("title"));
        String companyName = clean(job.get("company_name"));
        String candidateLocation = clean(job.get("candidate_required_location"));
        String description = stripHtml(clean(job.get("description")));
        if (isExcludedListing(title, companyName, description)) {
            return null;
        }
        String combined = lower(title + " " + companyName + " " + candidateLocation + " " + description);

        if (!matchesQuery(combined, loweredQuery)) {
            return null;
        }
        if (loweredCompany != null && !loweredCompany.isBlank() && !lower(companyName).contains(loweredCompany)) {
            return null;
        }
        if (loweredLocation != null && !loweredLocation.isBlank() && !matchesLocation(candidateLocation, loweredLocation)) {
            return null;
        }

        Map<String, Object> normalized = new HashMap<>();
        normalized.put("id", job.get("id"));
        normalized.put("title", title);
        normalized.put("company", companyName);
        normalized.put("companyLogo", clean(job.get("company_logo")));
        normalized.put("category", titleCase(clean(job.get("category"))));
        normalized.put("jobType", titleCase(clean(job.get("job_type"))));
        normalized.put("location", candidateLocation.isBlank() ? "Worldwide" : candidateLocation);
        normalized.put("salary", clean(job.get("salary")));
        normalized.put("url", clean(job.get("url")));
        normalized.put("applyUrl", clean(job.get("url")));
        normalized.put("publicationDate", clean(job.get("publication_date")));
        normalized.put("postedAgo", buildPostedAgo(clean(job.get("publication_date"))));
        normalized.put("snippet", buildSnippet(description));
        normalized.put("description", description);
        normalized.put("keywords", extractKeywords(description, title));
        normalized.put("source", "Remotive");
        return normalized;
    }

    private List<Map<String, Object>> fetchLinkedInJobs(String query, String location, String company, int limit)
            throws IOException, InterruptedException {
        if (isBlank(linkedInApiKey)) {
            return List.of();
        }

        String mergedSearch = List.of(query, company, location).stream()
                .map(this::clean)
                .filter(value -> !value.isBlank())
                .collect(Collectors.joining(" "));
        if (mergedSearch.isBlank()) {
            return List.of();
        }

        URI uri = buildLinkedInUri(mergedSearch);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("User-Agent", "ResumeStudio/1.0")
                .header("X-RapidAPI-Key", linkedInApiKey)
                .header("X-RapidAPI-Host", linkedInApiHost)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            return List.of();
        }

        Map<String, Object> payload = objectMapper.readValue(response.body(), new TypeReference<>() {});
        Object dataObject = payload.get("data");
        if (!(dataObject instanceof List<?> items)) {
            return List.of();
        }

        String loweredQuery = lower(query);
        String loweredLocation = lower(location);
        String loweredCompany = lower(company);

        return items.stream()
                .map(this::asMap)
                .filter(Objects::nonNull)
                .map(item -> normalizeLinkedInJob(item, loweredQuery, loweredLocation, loweredCompany))
                .filter(Objects::nonNull)
                .limit(limit)
                .collect(Collectors.toList());
    }

    private URI buildLinkedInUri(String mergedSearch) {
        List<String> params = new ArrayList<>();
        params.add("query=" + encode(mergedSearch));
        params.add("page=1");
        params.add("num_pages=1");
        String joined = String.join("&", params);
        String separator = linkedInSearchUrl.contains("?") ? "&" : "?";
        return URI.create(linkedInSearchUrl + separator + joined);
    }

    private Map<String, Object> normalizeLinkedInJob(
            Map<String, Object> item,
            String loweredQuery,
            String loweredLocation,
            String loweredCompany
    ) {
        String title = clean(item.get("job_title"));
        String companyName = clean(item.get("employer_name"));
        String description = stripHtml(clean(item.get("job_description")));
        String city = clean(item.get("job_city"));
        String state = clean(item.get("job_state"));
        String country = clean(item.get("job_country"));
        String publisher = clean(item.get("job_publisher"));
        String applyUrl = clean(item.get("job_apply_link"));
        String fallbackUrl = clean(item.get("job_google_link"));
        String selectedUrl = !applyUrl.isBlank() ? applyUrl : fallbackUrl;

        if (!isLinkedInListing(publisher, selectedUrl)) {
            return null;
        }
        if (isExcludedListing(title, companyName, description)) {
            return null;
        }

        String joinedLocation = List.of(city, state, country).stream()
                .map(this::clean)
                .filter(value -> !value.isBlank())
                .collect(Collectors.joining(", "));
        String normalizedLocation = joinedLocation.isBlank() ? "Worldwide" : joinedLocation;
        String combined = lower(title + " " + companyName + " " + normalizedLocation + " " + description);

        if (!matchesQuery(combined, loweredQuery)) {
            return null;
        }
        if (loweredCompany != null && !loweredCompany.isBlank() && !lower(companyName).contains(loweredCompany)) {
            return null;
        }
        if (loweredLocation != null && !loweredLocation.isBlank() && !matchesLocation(normalizedLocation, loweredLocation)) {
            return null;
        }

        String publicationDate = clean(item.get("job_posted_at_datetime_utc"));
        String salary = buildLinkedInSalary(item);

        Map<String, Object> normalized = new HashMap<>();
        normalized.put("id", clean(item.get("job_id")).isBlank() ? title + "-" + companyName : clean(item.get("job_id")));
        normalized.put("title", title.isBlank() ? "Untitled Role" : title);
        normalized.put("company", companyName.isBlank() ? "Unknown Company" : companyName);
        normalized.put("companyLogo", clean(item.get("employer_logo")));
        normalized.put("category", titleCase(clean(item.get("job_employment_type"))));
        normalized.put("jobType", titleCase(clean(item.get("job_employment_type"))));
        normalized.put("location", normalizedLocation);
        normalized.put("salary", salary);
        normalized.put("url", selectedUrl);
        normalized.put("applyUrl", selectedUrl);
        normalized.put("publicationDate", publicationDate);
        normalized.put("postedAgo", clean(item.get("job_posted_at")));
        normalized.put("snippet", buildSnippet(description));
        normalized.put("description", description);
        normalized.put("keywords", extractKeywords(description, title));
        normalized.put("source", "LinkedIn");
        return normalized;
    }

    private String buildLinkedInSalary(Map<String, Object> item) {
        String currency = clean(item.get("job_salary_currency"));
        String min = clean(item.get("job_min_salary"));
        String max = clean(item.get("job_max_salary"));

        if (!min.isBlank() && !max.isBlank()) {
            return (currency.isBlank() ? "" : currency + " ") + min + " - " + max;
        }
        if (!min.isBlank()) {
            return (currency.isBlank() ? "" : currency + " ") + min;
        }
        if (!max.isBlank()) {
            return (currency.isBlank() ? "" : currency + " ") + max;
        }
        return "";
    }

    private boolean isLinkedInListing(String publisher, String url) {
        String loweredPublisher = lower(publisher);
        String loweredUrl = lower(url);
        return loweredPublisher.contains("linkedin") || loweredUrl.contains("linkedin.com/jobs/");
    }

    private List<Map<String, Object>> mergeJobs(
            List<Map<String, Object>> primary,
            List<Map<String, Object>> secondary,
            int limit
    ) {
        Map<String, Map<String, Object>> merged = new LinkedHashMap<>();
        List<Map<String, Object>> combined = new ArrayList<>();
        combined.addAll(primary);
        combined.addAll(secondary);

        for (Map<String, Object> job : combined) {
            String key = lower(clean(job.get("title")))
                    + "|"
                    + lower(clean(job.get("company")))
                    + "|"
                    + lower(clean(job.get("location")));
            if (key.replace("|", "").isBlank()) {
                key = lower(clean(job.get("id")));
            }
            if (!merged.containsKey(key)) {
                merged.put(key, job);
            }
            if (merged.size() >= limit) {
                break;
            }
        }
        return new ArrayList<>(merged.values());
    }

    private List<Map<String, Object>> buildTrendingCompanies(List<Map<String, Object>> jobs) {
        Map<String, Long> counts = jobs.stream()
                .map(job -> clean(job.get("company")))
                .filter(value -> !value.isBlank())
                .collect(Collectors.groupingBy(value -> value, Collectors.counting()));

        return counts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(6)
                .map(entry -> {
                    Map<String, Object> company = new HashMap<>();
                    company.put("name", entry.getKey());
                    company.put("openings", entry.getValue());
                    return company;
                })
                .collect(Collectors.toList());
    }

    private List<String> extractKeywords(String description, String title) {
        String source = lower(title + " " + description);
        List<String> keywords = List.of(
                "java", "spring boot", "react", "typescript", "javascript", "python",
                "sql", "mysql", "postgresql", "aws", "azure", "docker", "kubernetes",
                "node", "graphql", "rest", "api", "full stack", "frontend", "backend",
                "devops", "data", "ai", "ml"
        );
        return keywords.stream().filter(source::contains).collect(Collectors.toList());
    }

    private boolean matchesLocation(String candidateLocation, String loweredLocation) {
        String loweredCandidate = lower(candidateLocation);
        if (loweredLocation.contains("remote") || loweredLocation.contains("worldwide")) {
            return loweredCandidate.contains("worldwide") || loweredCandidate.contains("remote") || loweredCandidate.isBlank();
        }
        return loweredCandidate.contains(loweredLocation);
    }

    private boolean matchesQuery(String combined, String loweredQuery) {
        if (loweredQuery == null || loweredQuery.isBlank()) {
            return true;
        }
        if (combined.contains(loweredQuery)) {
            return true;
        }

        List<String> tokens = Arrays.stream(loweredQuery.split("\\s+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .filter(token -> token.length() > 1)
                .filter(token -> !QUERY_STOP_WORDS.contains(token))
                .distinct()
                .collect(Collectors.toList());

        if (tokens.isEmpty()) {
            return true;
        }

        long matched = tokens.stream().filter(combined::contains).count();
        long threshold = Math.max(1, Math.min(tokens.size(), (long) Math.ceil(tokens.size() * 0.5)));
        return matched >= threshold;
    }

    private String buildSnippet(String description) {
        if (description == null || description.isBlank()) {
            return "";
        }
        String collapsed = description.replaceAll("\\s+", " ").trim();
        return collapsed.length() <= 180 ? collapsed : collapsed.substring(0, 177) + "...";
    }

    private String buildPostedAgo(String isoDate) {
        if (isoDate == null || isoDate.isBlank()) {
            return "";
        }
        try {
            OffsetDateTime posted;
            try {
                posted = OffsetDateTime.parse(isoDate, DateTimeFormatter.ISO_DATE_TIME);
            } catch (Exception ignored) {
                posted = LocalDateTime.parse(isoDate, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        .atZone(ZoneId.systemDefault())
                        .toOffsetDateTime();
            }
            long days = Duration.between(posted, OffsetDateTime.now()).toDays();
            if (days <= 0) {
                long hours = Duration.between(posted, OffsetDateTime.now()).toHours();
                if (hours <= 0) {
                    return "Just now";
                }
                return hours + "h ago";
            }
            if (days == 1) {
                return "1 day ago";
            }
            return days + " days ago";
        } catch (Exception ex) {
            return isoDate;
        }
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> cast = new HashMap<>();
            map.forEach((key, val) -> cast.put(String.valueOf(key), val));
            return cast;
        }
        return null;
    }

    private String clean(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private long safeLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value).trim());
        } catch (Exception ex) {
            return 0L;
        }
    }

    private String titleCase(String value) {
        String cleaned = clean(value);
        if (cleaned.isBlank()) {
            return "";
        }
        return Arrays.stream(cleaned.split("\\s+"))
                .filter(part -> !part.isBlank())
                .map(part -> Character.toUpperCase(part.charAt(0)) + part.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String stripHtml(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private List<String> parseExcludedTerms(String source) {
        return Stream.of(clean(source).split(","))
                .map(this::lower)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean isExcludedListing(String title, String company, String description) {
        if (excludedTerms.isEmpty()) {
            return false;
        }
        String combined = lower(title + " " + company + " " + description);
        return excludedTerms.stream().anyMatch(combined::contains);
    }
}
