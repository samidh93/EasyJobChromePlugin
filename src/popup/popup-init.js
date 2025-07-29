// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking for libraries...');
  
  // Configure PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
    console.log('PDF.js worker configured');
  }

  // Make js-yaml available as expected by ResumeParser
  if (window.jsyaml) {
    window.YAML = window.jsyaml;
    console.log('js-yaml configured');
  }

  // Wait for ResumeParser to be available
  function checkResumeParser() {
    console.log('Checking for ResumeParser...');
    console.log('Libraries state:', {
      jsyaml: !!window.jsyaml,
      pdfjsLib: !!window.pdfjsLib,
      ResumeParser: !!window.ResumeParser,
      ResumeParserType: typeof window.ResumeParser
    });

    if (window.ResumeParser && typeof window.ResumeParser === 'function') {
      console.log('ResumeParser is available!');
      window.librariesReady = true;
      
      // Test ResumeParser
      try {
        const parser = new window.ResumeParser();
        console.log('ResumeParser instance created successfully');
        console.log('ResumeParser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
      } catch (error) {
        console.error('Error creating ResumeParser instance:', error);
      }
    } else {
      console.log('ResumeParser not yet available, retrying in 100ms...');
      setTimeout(checkResumeParser, 100);
    }
  }

  // Start checking for ResumeParser
  checkResumeParser();
});

// Also check immediately in case DOM is already loaded
if (document.readyState === 'loading') {
  console.log('DOM is still loading, waiting for DOMContentLoaded...');
} else {
  console.log('DOM already loaded, configuring libraries immediately...');
  
  // Configure PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
  }

  // Make js-yaml available as expected by ResumeParser
  if (window.jsyaml) {
    window.YAML = window.jsyaml;
  }

  // Set a global flag for library readiness
  window.librariesReady = !!(window.jsyaml && window.pdfjsLib && window.ResumeParser);
  
  console.log('Libraries configured immediately:', {
    jsyaml: !!window.jsyaml,
    pdfjsLib: !!window.pdfjsLib,
    ResumeParser: !!window.ResumeParser,
    librariesReady: window.librariesReady
  });
} 