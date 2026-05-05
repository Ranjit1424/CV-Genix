package ai.createResume.Backend.Repositories;

import ai.createResume.Backend.Models.SavedResume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedResumeRepository extends JpaRepository<SavedResume, Long> {

    List<SavedResume> findByUserIdOrderBySavedAtDesc(Long userId);
}
