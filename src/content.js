import LinkedInJobHelper from './LinkedInJobHelper.js';

// This script monitors changes on the LinkedIn job search page
const observer = new MutationObserver(async (mutationsList, observer) => {
    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");

    if (searchElement) {
        // Once the target element is found, further observation can be paused
        // observer.disconnect(); // Uncomment this line if needed

        try {
            // Get total job count
            const totalJobs = LinkedInJobHelper.getTotalJobsSearchCount(searchElement);
            console.log(`${totalJobs} jobs found.`);

            // Get the number of available pages
            const pagesAvailable = LinkedInJobHelper.getAvailablePages(searchElement);
            console.log(`Available pages: ${pagesAvailable}`);

            // Get the list of jobs on the current page
            const jobs = await LinkedInJobHelper.getListOfJobsOnPage(searchElement); // Ensure the function resolves a Promise
            //console.log("Jobs on page:", jobs);

            // Process jobs
            for (const job of jobs) {
                if (LinkedInJobHelper.isJobApplied(job)) {
                    continue; // Skip already applied jobs
                }

                // Extract and process job details
                const jobDetails = LinkedInJobHelper.extractJobDetails(job);
                console.log("Job details:", jobDetails);

                // Perform additional processing if needed
            }

            // Scroll down to load more jobs if applicable
            window.scrollBy(0, 500); // Adjust the scroll value if necessary
        } catch (error) {
            console.error("An error occurred while processing jobs:", error);
        }
    }
});

// Start observing the DOM for child list or subtree changes
observer.observe(document.body, { childList: true, subtree: true });
