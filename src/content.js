import LinkedInJobHelper from './LinkedInJobHelper.js';

// This script monitors changes on the LinkedIn job search page
const observer = new MutationObserver(async (mutationsList, observer) => {
    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");

    if (searchElement) {
        // Once the target element is found, further observation can be paused
         observer.disconnect(); // Uncomment this line if needed

        try {
            // Get total job count
            const totalJobs = await LinkedInJobHelper.getTotalJobsSearchCount(searchElement);

            // Get the number of available pages
            const pagesAvailable = await LinkedInJobHelper.getAvailablePages(searchElement);

            // Get the list of jobs on the current page
            const jobs = await LinkedInJobHelper.getListOfJobsOnPage(searchElement); // Ensure the function resolves a Promise

            // Process jobs
            for (const job of jobs) {
                console.log(job);
                await LinkedInJobHelper.clickOnJob(job);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

        } catch (error) {
            console.error("An error occurred while processing jobs:", error);
        }
    }
});

// Start observing the DOM for child list or subtree changes
observer.observe(document.body, { childList: true, subtree: true });
