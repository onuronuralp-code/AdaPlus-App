const fs = require('fs');
let content = fs.readFileSync('src/main/java/app/adaplus/backend/service/ActivityService.java', 'utf8');
content = content.replace(/\.map\(ActivityDto::from\)/g, '.map(this::mapToDto)');

const method = `
    private ActivityDto mapToDto(Activity activity) {
        long rsvpCount = activityRsvpRepository.countByActivityId(activity.getId());
        UUID currentUserId = currentUserIdOptional();
        boolean userHasRsvp = currentUserId != null
                && activityRsvpRepository.existsByUserIdAndActivityId(currentUserId, activity.getId());
        return ActivityDto.from(activity, rsvpCount, userHasRsvp);
    }

    private UUID currentUserIdOptional() {`;
content = content.replace(/    private UUID currentUserIdOptional\(\) \{/, method);
fs.writeFileSync('src/main/java/app/adaplus/backend/service/ActivityService.java', content);
