# Resume Parser for Chrome Extension

A browser-compatible resume parser that supports multiple file formats including YAML, JSON, PDF, and plain text. Designed specifically for Chrome extension integration.

## Features

- 🏗️ **Multi-format Support**: YAML, JSON, PDF, and text files
- 🌐 **Browser Compatible**: Works in Chrome extension context
- 📱 **File API**: Uses browser File API for file handling
- 🔧 **No Dependencies**: Core parser has no external dependencies
- 🎨 **Simple Integration**: Easy to integrate into existing Chrome extensions

## Supported Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| YAML   | `.yaml`, `.yml` | Structured resume data |
| JSON   | `.json` | Structured resume data |
| PDF    | `.pdf` | Portable Document Format |
| Text   | `.txt` | Plain text resumes |

## Installation

### 1. Include Required Libraries

For full functionality, include these libraries in your Chrome extension:

```html
<!-- For YAML support -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js"></script>

<!-- For PDF support -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

<!-- Include the resume parser -->
<script src="resumeParser.js"></script>
```

### 2. Chrome Extension Manifest

Add the following permissions to your `manifest.json`:

```json
{
  "permissions": [
    "activeTab"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' https://cdnjs.cloudflare.com; object-src 'self'"
  }
}
```

## Usage

### Basic Usage

```javascript
// Initialize the parser
const parser = new ResumeParser();

// Handle file input
document.getElementById('resumeFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const resumeText = await parser.parseResume(file);
            console.log('Parsed resume:', resumeText);
            
            // Use the parsed text for form filling or processing
            fillLinkedInForm(resumeText);
            
        } catch (error) {
            console.error('Error parsing resume:', error.message);
        }
    }
});
```

### Advanced Usage

```javascript
// Check supported formats
const parser = new ResumeParser();
console.log('Supported formats:', parser.supportedFormats);

// Extract specific information
function extractResumeInfo(resumeText) {
    return {
        email: extractEmail(resumeText),
        phone: extractPhone(resumeText),
        skills: extractSkills(resumeText)
    };
}

// Use with drag and drop
document.addEventListener('drop', async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    
    if (file && parser.supportedFormats.includes(getFileExtension(file.name))) {
        const resumeText = await parser.parseResume(file);
        const info = extractResumeInfo(resumeText);
        // Process extracted information
    }
});
```

## API Reference

### ResumeParser Class

#### Constructor

```javascript
const parser = new ResumeParser();
```

#### Properties

- `supportedFormats`: Array of supported file extensions
- `supportedMimeTypes`: Array of supported MIME types

#### Methods

##### `parseResume(file)`

Parse a resume file and return formatted text.

**Parameters:**
- `file` (File): File object from input element or drag/drop

**Returns:**
- `Promise<string>`: Parsed resume text

**Example:**
```javascript
const resumeText = await parser.parseResume(file);
```

## Error Handling

The parser includes comprehensive error handling:

```javascript
try {
    const resumeText = await parser.parseResume(file);
    // Success
} catch (error) {
    if (error.message.includes('YAML parser not available')) {
        console.log('Please include js-yaml library');
    } else if (error.message.includes('PDF.js library not available')) {
        console.log('Please include PDF.js library');
    } else {
        console.log('Parse error:', error.message);
    }
}
```

## Integration with LinkedIn Auto-Fill

```javascript
// Example: Extract and fill LinkedIn form
async function processResumeForLinkedIn(file) {
    const parser = new ResumeParser();
    const resumeText = await parser.parseResume(file);
    
    // Extract key information
    const info = {
        name: extractName(resumeText),
        email: extractEmail(resumeText),
        phone: extractPhone(resumeText),
        experience: extractExperience(resumeText)
    };
    
    // Fill LinkedIn form fields
    if (info.email) {
        document.querySelector('#email-input').value = info.email;
    }
    if (info.phone) {
        document.querySelector('#phone-input').value = info.phone;
    }
    
    // Process experience for job applications
    fillJobApplicationForm(info);
}
```

## Demo

Open `demo.html` in your browser to see the parser in action. The demo shows:

- File upload functionality
- Multi-format parsing
- Error handling
- Information extraction
- Results display

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Dependencies

### Core Parser
- No external dependencies for basic functionality

### Enhanced Features
- **js-yaml**: For YAML file support
- **PDF.js**: For PDF file support

### For Chrome Extension
- File API support
- FileReader API support

## Common Issues

### 1. YAML Parser Not Available
```javascript
// Make sure js-yaml is loaded
if (typeof jsyaml === 'undefined') {
    console.error('js-yaml library not loaded');
}
```

### 2. PDF.js Not Available
```javascript
// Make sure PDF.js is loaded
if (typeof pdfjsLib === 'undefined') {
    console.error('PDF.js library not loaded');
}
```

### 3. File Reading Issues
```javascript
// Check file size and type
if (file.size > 10 * 1024 * 1024) { // 10MB limit
    throw new Error('File too large');
}
```

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 