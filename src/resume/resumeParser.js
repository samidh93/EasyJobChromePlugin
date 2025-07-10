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
     * Parse resume from different formats and return as text
     * @param {File} file - File object from input element
     * @returns {Promise<string>} - Parsed resume text
     */
    async parseResume(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const extension = this._getFileExtension(file.name).toLowerCase();
        
        if (!this.supportedFormats.includes(extension)) {
            throw new Error(`Unsupported file format: ${extension}`);
        }

        switch (extension) {
            case '.yaml':
            case '.yml':
                return await this._parseYaml(file);
            case '.json':
                return await this._parseJson(file);
            case '.pdf':
                return await this._parsePdf(file);
            case '.txt':
                return await this._parseText(file);
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
     * @returns {Promise<string>} - Formatted text
     */
    async _parseYaml(file) {
        try {
            const fileContents = await this._readFileAsText(file);
            // Use global jsyaml if available (loaded via script tag)
            const yamlParser = window.jsyaml || window.YAML;
            if (!yamlParser) {
                throw new Error('YAML parser not available. Please include js-yaml library.');
            }
            const data = yamlParser.load(fileContents);
            return this._formatStructuredData(data);
        } catch (error) {
            throw new Error(`Error parsing YAML: ${error.message}`);
        }
    }

    /**
     * Parse JSON resume
     * @param {File} file - JSON file object
     * @returns {Promise<string>} - Formatted text
     */
    async _parseJson(file) {
        try {
            const fileContents = await this._readFileAsText(file);
            const data = JSON.parse(fileContents);
            return this._formatStructuredData(data);
        } catch (error) {
            throw new Error(`Error parsing JSON: ${error.message}`);
        }
    }

    /**
     * Parse PDF resume
     * @param {File} file - PDF file object
     * @returns {Promise<string>} - Extracted text
     */
    async _parsePdf(file) {
        try {
            // Check if PDF.js is available
            if (!window.pdfjsLib) {
                throw new Error('PDF.js library not available. Please include PDF.js library.');
            }

            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            return fullText.trim();
        } catch (error) {
            throw new Error(`Error parsing PDF: ${error.message}`);
        }
    }

    /**
     * Parse plain text resume
     * @param {File} file - Text file object
     * @returns {Promise<string>} - File contents
     */
    async _parseText(file) {
        try {
            return await this._readFileAsText(file);
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
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Read file as ArrayBuffer using FileReader API
     * @param {File} file - File object
     * @returns {Promise<ArrayBuffer>} - File contents as ArrayBuffer
     */
    _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
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
