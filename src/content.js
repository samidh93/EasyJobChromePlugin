import LinkedInJobHelper from './LinkedInJobHelper.js';

window.onload = async () => {
    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");
    if (searchElement) {
        const totalJobs = LinkedInJobHelper.getTotalJobsSearchCount(searchElement);
        console.log(`Found ${totalJobs} jobs.`);

        const pagesAvailable = LinkedInJobHelper.getAvailablePages(searchElement);
        console.log(`Available pages: ${pagesAvailable}`);

        const jobs = await LinkedInJobHelper.getListOfJobsOnPage(searchElement);
        console.log("Jobs on page:", jobs);

        for (const job of jobs) {
            if (LinkedInJobHelper.isJobApplied(job)) {
                continue;
            }
            // Extract job details
        }

        window.scrollBy(0, 500); // Scrolls down by 500 pixels
    } else {
        console.log("Search element not found.");
    }
};
