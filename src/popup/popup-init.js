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

  // Debug: Check if ResumeParser is loaded
  console.log('Libraries state after DOM ready:', {
    jsyaml: !!window.jsyaml,
    pdfjsLib: !!window.pdfjsLib,
    ResumeParser: !!window.ResumeParser,
    ResumeParserType: typeof window.ResumeParser
  });

  // Set a global flag for library readiness
  window.librariesReady = !!(window.jsyaml && window.pdfjsLib && window.ResumeParser);
  
  if (!window.ResumeParser) {
    console.error('ResumeParser not loaded properly');
  } else {
    console.log('All libraries loaded successfully');
  }
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