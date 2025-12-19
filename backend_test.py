#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class TamaleManAPITester:
    def __init__(self, base_url="https://tamale-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(name)
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({"test": name, "details": details})
            print(f"❌ {name} - FAILED: {details}")

    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_menu_categories(self):
        """Test menu categories endpoint"""
        try:
            response = requests.get(f"{self.api_url}/menu/categories", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                expected_categories = ["Signature Tamales", "Sides", "Drinks", "Desserts"]
                found_categories = [cat.get("name", "") for cat in data]
                
                # Check if expected categories exist
                missing_categories = [cat for cat in expected_categories if cat not in found_categories]
                if missing_categories:
                    success = False
                    details += f", Missing categories: {missing_categories}"
                else:
                    details += f", Found {len(data)} categories: {found_categories}"
                    
            self.log_test("Menu Categories", success, details)
            return success, data if success else []
        except Exception as e:
            self.log_test("Menu Categories", False, str(e))
            return False, []

    def test_menu_items(self):
        """Test menu items endpoint"""
        try:
            response = requests.get(f"{self.api_url}/menu/items", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if len(data) > 0:
                    # Check if items have required fields
                    required_fields = ["item_id", "name", "description", "price", "category_id"]
                    first_item = data[0]
                    missing_fields = [field for field in required_fields if field not in first_item]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in items: {missing_fields}"
                    else:
                        details += f", Found {len(data)} menu items with proper structure"
                else:
                    success = False
                    details += ", No menu items found"
                    
            self.log_test("Menu Items", success, details)
            return success, data if success else []
        except Exception as e:
            self.log_test("Menu Items", False, str(e))
            return False, []

    def test_featured_items(self):
        """Test featured menu items endpoint"""
        try:
            response = requests.get(f"{self.api_url}/menu/items?featured=true", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Found {len(data)} featured items"
                
            self.log_test("Featured Menu Items", success, details)
            return success
        except Exception as e:
            self.log_test("Featured Menu Items", False, str(e))
            return False

    def test_testimonials(self):
        """Test testimonials endpoint"""
        try:
            response = requests.get(f"{self.api_url}/testimonials", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if len(data) > 0:
                    # Check testimonial structure
                    required_fields = ["testimonial_id", "author_name", "content", "rating"]
                    first_testimonial = data[0]
                    missing_fields = [field for field in required_fields if field not in first_testimonial]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += f", Found {len(data)} testimonials with proper structure"
                else:
                    details += ", No testimonials found (this might be expected)"
                    
            self.log_test("Testimonials", success, details)
            return success
        except Exception as e:
            self.log_test("Testimonials", False, str(e))
            return False

    def test_faq(self):
        """Test FAQ endpoint"""
        try:
            response = requests.get(f"{self.api_url}/faq", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if len(data) > 0:
                    # Check FAQ structure
                    required_fields = ["faq_id", "question", "answer"]
                    first_faq = data[0]
                    missing_fields = [field for field in required_fields if field not in first_faq]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += f", Found {len(data)} FAQ items with proper structure"
                else:
                    details += ", No FAQ items found"
                    
            self.log_test("FAQ Items", success, details)
            return success
        except Exception as e:
            self.log_test("FAQ Items", False, str(e))
            return False

    def test_site_settings(self):
        """Test site settings endpoint"""
        try:
            response = requests.get(f"{self.api_url}/settings", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Check for key settings
                expected_fields = ["site_name", "hero_title", "hero_subtitle", "address", "phone", "email"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing settings: {missing_fields}"
                else:
                    details += f", All key settings present. Site: {data.get('site_name', 'N/A')}"
                    
            self.log_test("Site Settings", success, details)
            return success
        except Exception as e:
            self.log_test("Site Settings", False, str(e))
            return False

    def test_contact_form(self):
        """Test contact form submission"""
        try:
            contact_data = {
                "name": "Test User",
                "email": "test@example.com",
                "phone": "555-123-4567",
                "message": "This is a test message from automated testing."
            }
            
            response = requests.post(
                f"{self.api_url}/contact", 
                json=contact_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if "submission_id" in data:
                    details += f", Contact submitted with ID: {data['submission_id']}"
                else:
                    success = False
                    details += ", No submission ID returned"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:100]}"
                    
            self.log_test("Contact Form Submission", success, details)
            return success
        except Exception as e:
            self.log_test("Contact Form Submission", False, str(e))
            return False

    def test_seed_endpoint(self):
        """Test database seeding (should return already seeded message)"""
        try:
            response = requests.post(f"{self.api_url}/seed", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Response: {data.get('message', 'No message')}"
                
            self.log_test("Database Seed", success, details)
            return success
        except Exception as e:
            self.log_test("Database Seed", False, str(e))
            return False

    def test_order_creation_validation(self):
        """Test order creation with invalid data (should fail gracefully)"""
        try:
            # Test with missing required fields
            invalid_order = {
                "customer_name": "Test User",
                # Missing email, phone, items, etc.
            }
            
            response = requests.post(
                f"{self.api_url}/orders/create",
                json=invalid_order,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Should return 422 (validation error) or similar
            success = response.status_code in [400, 422]
            details = f"Status: {response.status_code} (expected 400/422 for validation error)"
            
            if not success:
                details += f", Unexpected response for invalid order data"
                
            self.log_test("Order Validation", success, details)
            return success
        except Exception as e:
            self.log_test("Order Validation", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Tamale Man API Tests...")
        print(f"Testing against: {self.api_url}")
        print("=" * 60)
        
        # Test basic endpoints
        self.test_health_endpoint()
        self.test_site_settings()
        
        # Test menu endpoints
        categories_success, categories = self.test_menu_categories()
        items_success, items = self.test_menu_items()
        self.test_featured_items()
        
        # Test content endpoints
        self.test_testimonials()
        self.test_faq()
        
        # Test form submission
        self.test_contact_form()
        
        # Test database and validation
        self.test_seed_endpoint()
        self.test_order_creation_validation()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        if self.passed_tests:
            print(f"\n✅ Passed Tests: {', '.join(self.passed_tests)}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TamaleManAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())