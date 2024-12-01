// content.js
if (window.location.href.includes('linkedin.com/jobs')) {
    const applyButton = document.querySelector('.jobs-s-apply button');
    
    if (applyButton) {
      // Detect if the "Easy Apply" button is available
      applyButton.addEventListener('click', () => {
        // Fill the application form
        fillApplicationForm();
      });
    }
  }
  
  function fillApplicationForm() {
    const nameField = document.querySelector('input[name="firstName"]');
    const emailField = document.querySelector('input[name="email"]');
    const resumeField = document.querySelector('input[type="file"]');
    
    if (nameField && emailField) {
      // You should replace these with actual data (from user profile or local storage)
      nameField.value = 'Your First Name';
      emailField.value = 'your-email@example.com';
  
      // You could also auto-upload a resume if it's a file input
      if (resumeField) {
        const resumePath = 'path/to/your/resume.pdf'; // Local file or URL
        resumeField.value = resumePath;
      }
    }
  }
  