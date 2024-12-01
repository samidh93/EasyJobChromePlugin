// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const jobList = document.getElementById('job-list');
    const clearButton = document.getElementById('clear-all');
  
    // Load job data from local storage (or Firebase, depending on your setup)
    chrome.storage.local.get('jobs', function(data) {
      const jobs = data.jobs || [];
      renderJobList(jobs);
    });
  
    // Function to render jobs
    function renderJobList(jobs) {
      jobList.innerHTML = '';
      jobs.forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.classList.add('job-item');
        jobElement.innerHTML = `
          <p><strong>${job.title}</strong> at ${job.company}</p>
          <p>Status: ${job.status}</p>
          <p>Applied on: ${new Date(job.date).toLocaleDateString()}</p>
        `;
        jobList.appendChild(jobElement);
      });
    }
  
    // Clear all jobs from local storage
    clearButton.addEventListener('click', () => {
      chrome.storage.local.set({ jobs: [] });
      renderJobList([]);
    });
  });
  