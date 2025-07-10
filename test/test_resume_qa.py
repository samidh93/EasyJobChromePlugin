#!/usr/bin/env python3
"""
Resume Question Answering Test
Tests the ability to parse different resume formats and answer typical LinkedIn application questions
using Ollama with qwen2.5:3b model.
"""

import json
import yaml
import PyPDF2
import requests
import os
import sys
from pathlib import Path
from typing import Dict, Any, Optional
import argparse

class ResumeParser:
    """Handles parsing of different resume formats"""
    
    def __init__(self):
        self.supported_formats = ['.yaml', '.yml', '.json', '.pdf', '.txt']
    
    def parse_resume(self, file_path: str) -> str:
        """Parse resume from different formats and return as text"""
        path_obj = Path(file_path)
        
        if not path_obj.exists():
            raise FileNotFoundError(f"Resume file not found: {path_obj}")
        
        extension = path_obj.suffix.lower()
        
        if extension in ['.yaml', '.yml']:
            return self._parse_yaml(path_obj)
        elif extension == '.json':
            return self._parse_json(path_obj)
        elif extension == '.pdf':
            return self._parse_pdf(path_obj)
        elif extension == '.txt':
            return self._parse_text(path_obj)
        else:
            raise ValueError(f"Unsupported file format: {extension}")
    
    def _parse_yaml(self, file_path: Path) -> str:
        """Parse YAML resume"""
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        return self._format_structured_data(data)
    
    def _parse_json(self, file_path: Path) -> str:
        """Parse JSON resume"""
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return self._format_structured_data(data)
    
    def _parse_pdf(self, file_path: Path) -> str:
        """Parse PDF resume"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            raise ValueError(f"Error parsing PDF: {e}")
        return text.strip()
    
    def _parse_text(self, file_path: Path) -> str:
        """Parse plain text resume"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _format_structured_data(self, data: Dict[Any, Any]) -> str:
        """Format structured data (YAML/JSON) into readable text"""
        formatted_text = ""
        
        if isinstance(data, dict):
            for key, value in data.items():
                formatted_text += f"\n{key.upper().replace('_', ' ')}:\n"
                formatted_text += self._format_value(value, indent=1)
        
        return formatted_text.strip()
    
    def _format_value(self, value, indent=0) -> str:
        """Recursively format values with proper indentation"""
        indent_str = "  " * indent
        
        if isinstance(value, dict):
            result = ""
            for k, v in value.items():
                result += f"{indent_str}{k}: "
                if isinstance(v, (dict, list)):
                    result += f"\n{self._format_value(v, indent + 1)}"
                else:
                    result += f"{v}\n"
            return result
        elif isinstance(value, list):
            result = ""
            for item in value:
                if isinstance(item, dict):
                    result += f"{indent_str}- {self._format_value(item, indent + 1)}"
                else:
                    result += f"{indent_str}- {item}\n"
            return result
        else:
            return f"{indent_str}{value}\n"


class OllamaQA:
    """Handles question answering using Ollama"""
    
    def __init__(self, model="qwen2.5:3b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = base_url
        self.api_url = f"{base_url}/api/generate"
    
    def is_ollama_available(self) -> bool:
        """Check if Ollama service is available"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def answer_question(self, resume_text: str, question: str) -> str:
        """Answer a question based on resume content"""
        if not self.is_ollama_available():
            return "ERROR: Ollama service is not available. Please ensure Ollama is running."
        
        prompt = f"""Based on the following resume information, please answer the question accurately and concisely:

RESUME:
{resume_text}

QUESTION: {question}

ANSWER:"""
        
        try:
            response = requests.post(
                self.api_url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "No response received")
            else:
                return f"ERROR: HTTP {response.status_code} - {response.text}"
                
        except requests.RequestException as e:
            return f"ERROR: Request failed - {str(e)}"


class LinkedInQATest:
    """Test class for LinkedIn-style question answering"""
    
    def __init__(self):
        self.parser = ResumeParser()
        self.qa_engine = OllamaQA()
        
        # 10 typical LinkedIn application questions
        self.linkedin_questions = [
            "What is your current job title and company?",
            "How many years of experience do you have in your field?",
            "What are your top 3 technical skills?",
            "What programming languages are you proficient in?",
            "Describe your most recent work experience and key responsibilities.",
            "What is your highest level of education and field of study?",
            "Are you authorized to work in Germany without sponsorship?",
            "What is your preferred salary range?",
            "What cloud platforms have you worked with?",
            "Do you have experience with DevOps tools and practices?"
        ]
    
    def run_test(self, resume_path: str, output_file: Optional[str] = None):
        """Run the complete test suite"""
        print(f"🚀 Starting Resume Q&A Test")
        print(f"📄 Resume file: {resume_path}")
        print(f"🤖 Using model: {self.qa_engine.model}")
        print("=" * 60)
        
        try:
            # Parse resume
            print("📋 Parsing resume...")
            resume_text = self.parser.parse_resume(resume_path)
            print(f"✅ Successfully parsed resume ({len(resume_text)} characters)")
            
            # Check Ollama availability
            if not self.qa_engine.is_ollama_available():
                print("❌ Ollama service is not available!")
                print("💡 Make sure Ollama is running: 'ollama serve'")
                print("💡 Make sure qwen2.5:3b model is installed: 'ollama pull qwen2.5:3b'")
                return
            
            print("✅ Ollama service is available")
            print("\n🔍 Answering LinkedIn application questions...")
            
            results = []
            for i, question in enumerate(self.linkedin_questions, 1):
                print(f"\n[{i}/10] {question}")
                answer = self.qa_engine.answer_question(resume_text, question)
                
                result = {
                    "question": question,
                    "answer": answer
                }
                results.append(result)
                
                # Print answer with proper formatting
                print(f"💬 Answer: {answer}")
                print("-" * 40)
            
            # Save results if output file specified
            if output_file:
                self._save_results(results, resume_path, output_file)
                print(f"\n💾 Results saved to: {output_file}")
            
            print("\n✅ Test completed successfully!")
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            sys.exit(1)
    
    def _save_results(self, results: list, resume_path: str, output_file: str):
        """Save test results to JSON file"""
        output_data = {
            "test_info": {
                "resume_file": resume_path,
                "model": self.qa_engine.model,
                "total_questions": len(results)
            },
            "results": results
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)


def main():
    """Main function to run the test"""
    parser = argparse.ArgumentParser(description="Test resume Q&A with Ollama")
    parser.add_argument("resume_file", help="Path to resume file (YAML, JSON, PDF, or TXT)")
    parser.add_argument("--output", "-o", help="Output file for results (JSON)")
    parser.add_argument("--model", "-m", default="qwen2.5:3b", help="Ollama model to use")
    
    args = parser.parse_args()
    
    # Initialize test
    test = LinkedInQATest()
    test.qa_engine.model = args.model
    
    # Run test
    test.run_test(args.resume_file, args.output)


if __name__ == "__main__":
    main() 