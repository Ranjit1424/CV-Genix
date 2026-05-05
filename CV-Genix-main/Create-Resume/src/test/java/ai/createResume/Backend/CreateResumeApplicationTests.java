package ai.createResume.Backend;

import ai.createResume.Backend.Services.ResumeService;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CreateResumeApplicationTests {

	@Autowired
	private ResumeService resumeService;

	@Test
	void contextLoads() throws IOException {
		resumeService.generateResumeResponse("I am sarthak khatpe with 3 years of experience in spring boot and servicenow.");
	}

}
