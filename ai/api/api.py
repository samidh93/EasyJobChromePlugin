# Base class for Handling AI API requests

import json
import requests

class AiBase:
    def __init__(self,URL, API_KEY):
        self.URL = URL
        self.API_KEY = API_KEY

    