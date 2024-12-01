// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Tracker Extension Installed');
  });
  
  // Function to add a job to the local storage
  function addJob(job) {
    chrome.storage.local.get('jobs', function(data) {
      const jobs = data.jobs || [];
      jobs.push(job);
      chrome.storage.local.set({ jobs });
    });
  }
  
  // Example of adding a job (you can call this from content.js when a job is applied)
  addJob({
    title: 'Software Engineer',
    company: 'XYZ Corp',
    status: 'Applied',
    date: new Date().toISOString()
  });
  