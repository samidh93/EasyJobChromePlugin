/**
 * Resume Parser for Chrome Extension
 * Supports YAML, JSON, PDF, and plain text resumes
 * Browser-compatible version for Chrome extensions
 */

// Import js-yaml for YAML parsing (needs to be included in extension)
// For Chrome extension, this should be loaded via script tag or bundled

class ResumeParser {
    constructor() {
        this.supportedFormats = ['.yaml', '.yml', '.json', '.pdf', '.txt'];
        this.supportedMimeTypes = [
            'application/x-yaml',
            'text/yaml',
            'application/json',
            'application/pdf',
            'text/plain'
        ];
    }

    /**
     * Parse resume and return structured data with formatted text
     * @param {File|Object} file - Resume file to parse (File object or custom format with buffer)
     * @returns {Promise<Object>} - Parsed resume data with both structured and formatted text
     */
    async parseResume(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        // Handle custom file format from Chrome extension
        let fileObject = file;
        if (file.buffer && Array.isArray(file.buffer)) {
            // Convert custom format to File object
            const uint8Array = new Uint8Array(file.buffer);
            const blob = new Blob([uint8Array], { type: file.type || 'application/octet-stream' });
            fileObject = new File([blob], file.name, {
                type: file.type,
                lastModified: file.lastModified || Date.now()
            });
        }

        const extension = this._getFileExtension(fileObject.name).toLowerCase();
        
        if (!this.supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format: ${extension}`);
        }

        switch (extension) {
            case '.yaml':
            case '.yml':
                return await this._parseYaml(fileObject);
            case '.json':
                return await this._parseJson(fileObject);
            case '.pdf':
                return await this._parsePdf(fileObject);
            case '.txt':
                return await this._parseText(fileObject);
            default:
                throw new Error(`Unsupported file format: ${extension}`);
        }
    }

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} - File extension
     */
    _getFileExtension(filename) {
        return filename.slice(filename.lastIndexOf('.'));
    }

    /**
     * Parse YAML resume
     * @param {File} file - YAML file object
     * @returns {Promise<Object>} - Parsed data with structured and formatted text
     */
    async _parseYaml(file) {
        try {
            console.log('ResumeParser: Parsing YAML file...');
            const fileContents = await this._readFileAsText(file);
            console.log('ResumeParser: YAML file contents length:', fileContents.length);
            console.log('ResumeParser: YAML file contents preview:', fileContents.substring(0, 200));
            
            // Use global jsyaml if available (loaded via script tag)
            const yamlParser = window.jsyaml || window.YAML;
            console.log('ResumeParser: YAML parser available:', !!yamlParser);
            console.log('ResumeParser: YAML parser type:', typeof yamlParser);
            
            if (!yamlParser) {
                throw new Error('YAML parser not available. Please include js-yaml library.');
            }
            
            const structuredData = yamlParser.load(fileContents);
            console.log('ResumeParser: Parsed YAML data:', structuredData);
            console.log('ResumeParser: YAML data keys:', structuredData ? Object.keys(structuredData) : []);
            
            const formattedText = this._formatStructuredData(structuredData);
            console.log('ResumeParser: Formatted text length:', formattedText.length);
            
            const result = {
                structured: structuredData,
                formatted: formattedText,
                type: 'yaml'
            };
            
            console.log('ResumeParser: YAML parsing result:', {
                hasStructured: !!result.structured,
                structuredKeys: result.structured ? Object.keys(result.structured) : [],
                formattedLength: result.formatted.length,
                type: result.type
            });
            
            return result;
        } catch (error) {
            console.error('ResumeParser: YAML parsing error:', error);
            throw new Error(`Error parsing YAML: ${error.message}`);
        }
    }

    /**
     * Parse JSON resume
     * @param {File} file - JSON file object
     * @returns {Promise<Object>} - Parsed data with structured and formatted text
     */
    async _parseJson(file) {
        try {
            const fileContents = await this._readFileAsText(file);
            const structuredData = JSON.parse(fileContents);
            const formattedText = this._formatStructuredData(structuredData);
            
            return {
                structured: structuredData,
                formatted: formattedText,
                type: 'json'
            };
        } catch (error) {
            throw new Error(`Error parsing JSON: ${error.message}`);
        }
    }

    /**
     * Parse PDF resume with enhanced debugging and link handling
     * @param {File} file - PDF file object
     * @returns {Promise<Object>} - Parsed data with structured and formatted text
     */
    async _parsePdf(file) {
        try {
            console.log('ResumeParser: Starting PDF parsing...');
            console.log('ResumeParser: File name:', file.name);
            console.log('ResumeParser: File size:', file.size);
            console.log('ResumeParser: File type:', file.type);
            
            // Check if PDF.js is available
            if (!window.pdfjsLib) {
                throw new Error('PDF.js library not available. Please include PDF.js library.');
            }
            console.log('ResumeParser: PDF.js library found');

            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            console.log('ResumeParser: ArrayBuffer size:', arrayBuffer.byteLength);
            
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            console.log('ResumeParser: PDF loaded, pages:', pdf.numPages);
            
            let fullText = '';
            let extractedLinks = [];
            let pageDetails = [];
            
            for (let i = 1; i <= pdf.numPages; i++) {
                console.log(`ResumeParser: Processing page ${i}/${pdf.numPages}`);
                const page = await pdf.getPage(i);
                console.log(`ResumeParser: Page ${i} size:`, page.getViewport({ scale: 1.0 }));
                
                // Get text content
                const textContent = await page.getTextContent();
                console.log(`ResumeParser: Page ${i} text items:`, textContent.items.length);
                
                // Extract text with position information
                let pageText = '';
                let pageLinks = [];
                
                for (let j = 0; j < textContent.items.length; j++) {
                    const item = textContent.items[j];
                    console.log(`ResumeParser: Page ${i} item ${j}:`, {
                        str: item.str,
                        dir: item.dir,
                        transform: item.transform,
                        width: item.width,
                        height: item.height,
                        fontName: item.fontName
                    });
                    
                    pageText += item.str + ' ';
                    
                    // Check for potential links (URLs in text)
                    const urlMatches = item.str.match(/(https?:\/\/[^\s]+)/gi);
                    if (urlMatches) {
                        pageLinks.push(...urlMatches);
                        console.log(`ResumeParser: Found URLs in item ${j}:`, urlMatches);
                    }
                }
                
                // Try to get annotations (links, etc.)
                try {
                    const annotations = await page.getAnnotations();
                    console.log(`ResumeParser: Page ${i} annotations:`, annotations.length);
                    
                    for (let k = 0; k < annotations.length; k++) {
                        const annotation = annotations[k];
                        console.log(`ResumeParser: Page ${i} annotation ${k}:`, {
                            subtype: annotation.subtype,
                            url: annotation.url,
                            title: annotation.title,
                            contents: annotation.contents
                        });
                        
                        if (annotation.subtype === 'Link' && annotation.url) {
                            pageLinks.push(annotation.url);
                            console.log(`ResumeParser: Found link annotation:`, annotation.url);
                        }
                    }
                } catch (annotationError) {
                    console.log(`ResumeParser: Could not get annotations for page ${i}:`, annotationError.message);
                }
                
                // Try to get operator list for more detailed content analysis
                try {
                    const opList = await page.getOperatorList();
                    console.log(`ResumeParser: Page ${i} operator list length:`, opList.fnArray.length);
                    
                    // Look for text operators that might contain links
                    for (let l = 0; l < opList.fnArray.length; l++) {
                        const op = opList.fnArray[l];
                        if (op === window.pdfjsLib.OPS.showText || op === window.pdfjsLib.OPS.showSpacedText) {
                            const args = opList.argsArray[l];
                            console.log(`ResumeParser: Page ${i} text operator ${l}:`, {
                                operator: op,
                                args: args
                            });
                        }
                    }
                } catch (opListError) {
                    console.log(`ResumeParser: Could not get operator list for page ${i}:`, opListError.message);
                }
                
                fullText += pageText + '\n';
                extractedLinks.push(...pageLinks);
                
                pageDetails.push({
                    pageNumber: i,
                    textLength: pageText.length,
                    linksFound: pageLinks.length,
                    textItems: textContent.items.length
                });
            }
            
            const extractedText = fullText.trim();
            console.log('ResumeParser: PDF parsing completed');
            console.log('ResumeParser: Total text length:', extractedText.length);
            console.log('ResumeParser: Total links found:', extractedLinks.length);
            console.log('ResumeParser: Page details:', pageDetails);
            console.log('ResumeParser: Extracted links:', extractedLinks);
            console.log('ResumeParser: Text preview (first 500 chars):', extractedText.substring(0, 500));
            console.log('ResumeParser: Text preview (last 500 chars):', extractedText.substring(Math.max(0, extractedText.length - 500)));
            
            // Enhance the extracted text with link information for better AI processing
            let enhancedText = extractedText;
            if (extractedLinks.length > 0) {
                const linkSummary = '\n\n=== EXTRACTED LINKS ===\n' + 
                    extractedLinks.map((link, index) => `${index + 1}. ${link}`).join('\n') +
                    '\n=== END LINKS ===\n';
                enhancedText += linkSummary;
                console.log('ResumeParser: Added link summary to extracted text');
            }
            
            // Check for common parsing issues
            const issues = [];
            if (extractedText.length < 100) {
                issues.push('Very short text extracted - possible parsing issue');
            }
            if (!extractedText.includes('@') && !extractedText.includes('email')) {
                issues.push('No email found - possible parsing issue');
            }
            if (extractedText.includes('') || extractedText.includes('?')) {
                // Only flag if there are many encoding issues, not just a few
                const encodingIssues = (extractedText.match(/[^\x00-\x7F]/g) || []).length;
                if (encodingIssues > extractedText.length * 0.1) { // More than 10% non-ASCII
                    issues.push('Significant encoding issues detected');
                }
            }
            if (extractedText.split('\n').length < 5) {
                // For PDFs, check if we have reasonable content despite few lines
                const hasReasonableContent = extractedText.length > 1000 || extractedLinks.length > 0;
                if (!hasReasonableContent) {
                    issues.push('Very few lines - possible parsing issue');
                }
            }
            
            // Add positive indicators
            const positiveIndicators = [];
            if (extractedLinks.length > 0) {
                positiveIndicators.push(`Successfully extracted ${extractedLinks.length} links`);
            }
            if (extractedText.length > 2000) {
                positiveIndicators.push('Extracted substantial text content');
            }
            if (extractedText.includes('@') || extractedText.includes('email')) {
                positiveIndicators.push('Email information detected');
            }
            
            if (issues.length > 0) {
                console.warn('ResumeParser: Potential parsing issues detected:', issues);
            }
            if (positiveIndicators.length > 0) {
                console.log('ResumeParser: Positive parsing indicators:', positiveIndicators);
            }
            
            return {
                structured: null, // PDF doesn't provide structured data
                formatted: enhancedText, // Use enhancedText here
                type: 'pdf',
                metadata: {
                    pages: pdf.numPages,
                    links: extractedLinks,
                    pageDetails: pageDetails,
                    issues: issues
                }
            };
        } catch (error) {
            console.error('ResumeParser: PDF parsing error:', error);
            console.error('ResumeParser: Error stack:', error.stack);
            throw new Error(`Error parsing PDF: ${error.message}`);
        }
    }

    /**
     * Parse plain text resume
     * @param {File} file - Text file object
     * @returns {Promise<Object>} - File contents with type info
     */
    async _parseText(file) {
        try {
            const textContent = await this._readFileAsText(file);
            
            return {
                structured: null, // Plain text doesn't provide structured data
                formatted: textContent,
                type: 'text'
            };
        } catch (error) {
            throw new Error(`Error parsing text file: ${error.message}`);
        }
    }

    /**
     * Read file as text using FileReader API
     * @param {File} file - File object
     * @returns {Promise<string>} - File contents as text
     */
    _readFileAsText(file) {
        return new Promise((resolve, reject) => {
            try {
                if (!file || !(file instanceof Blob)) {
                    reject(new Error('Invalid file object provided'));
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            } catch (error) {
                reject(new Error(`Error reading file as text: ${error.message}`));
            }
        });
    }

    /**
     * Read file as ArrayBuffer using FileReader API
     * @param {File} file - File object
     * @returns {Promise<ArrayBuffer>} - File contents as ArrayBuffer
     */
    _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            try {
                if (!file || !(file instanceof Blob)) {
                    reject(new Error('Invalid file object provided'));
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            } catch (error) {
                reject(new Error(`Error reading file as ArrayBuffer: ${error.message}`));
            }
        });
    }

    /**
     * Format structured data (YAML/JSON) into readable text
     * @param {Object} data - Structured data
     * @returns {string} - Formatted text
     */
    _formatStructuredData(data) {
        let formattedText = "";
        
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            for (const [key, value] of Object.entries(data)) {
                formattedText += `\n${key.toUpperCase().replace(/_/g, ' ')}:\n`;
                formattedText += this._formatValue(value, 1);
            }
        }
        
        return formattedText.trim();
    }

    /**
     * Recursively format values with proper indentation
     * @param {*} value - Value to format
     * @param {number} indent - Indentation level
     * @returns {string} - Formatted value
     */
    _formatValue(value, indent = 0) {
        const indentStr = "  ".repeat(indent);
        
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                let result = "";
                for (const item of value) {
                    if (typeof item === 'object' && item !== null) {
                        result += `${indentStr}- ${this._formatValue(item, indent + 1)}`;
                    } else {
                        result += `${indentStr}- ${item}\n`;
                    }
                }
                return result;
            } else {
                let result = "";
                for (const [k, v] of Object.entries(value)) {
                    result += `${indentStr}${k}: `;
                    if (typeof v === 'object' && v !== null) {
                        result += `\n${this._formatValue(v, indent + 1)}`;
                    } else {
                        result += `${v}\n`;
                    }
                }
                return result;
            }
        } else {
            return `${indentStr}${value}\n`;
        }
    }
}

// Export for Chrome extension usage
if (typeof window !== 'undefined') {
    window.ResumeParser = ResumeParser;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ResumeParser };
}
