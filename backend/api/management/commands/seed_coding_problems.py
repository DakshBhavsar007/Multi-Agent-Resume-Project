from django.core.management.base import BaseCommand
from api.models import CodingProblem

CODING_PROBLEMS_SEED_DATA = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "easy",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
        "examples": [
            {
                "input": "nums = [2,7,11,15], target = 9",
                "output": "[0,1]"
            },
            {
                "input": "nums = [3,2,4], target = 6",
                "output": "[1,2]"
            }
        ],
        "constraints": [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "-10^9 <= target <= 10^9",
            "Only one valid answer exists."
        ],
        "starter_code": {
            "javascript": "function twoSum(nums, target) {\n    // Write your solution here\n    \n}",
            "python": "def two_sum(nums, target):\n    # Write your solution here\n    pass"
        },
        "test_cases": [
            {
                "input": {"nums": [2, 7, 11, 15], "target": 9},
                "expected_output": [0, 1]
            },
            {
                "input": {"nums": [3, 2, 4], "target": 6},
                "expected_output": [1, 2]
            },
            {
                "input": {"nums": [3, 3], "target": 6},
                "expected_output": [0, 1]
            }
        ],
        "tags": ["array", "hash-table"]
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "easy",
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        "examples": [
            {
                "input": 's = "()[]{}"',
                "output": "true"
            },
            {
                "input": 's = "(]"',
                "output": "false"
            }
        ],
        "constraints": [
            "1 <= s.length <= 10^4",
            "s consists of parentheses only '()[]{}'."
        ],
        "starter_code": {
            "javascript": "function isValid(s) {\n    // Write your solution here\n    \n}",
            "python": "def is_valid(s):\n    # Write your solution here\n    pass"
        },
        "test_cases": [
            {
                "input": {"s": "()[]{}"},
                "expected_output": True
            },
            {
                "input": {"s": "(]"},
                "expected_output": False
            },
            {
                "input": {"s": "([)]"},
                "expected_output": False
            },
            {
                "input": {"s": "{[]}"},
                "expected_output": True
            }
        ],
        "tags": ["string", "stack"]
    }
]

class Command(BaseCommand):
    help = "Seeds database with Coding Problems"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Coding problems...")
        count = 0
        for p in CODING_PROBLEMS_SEED_DATA:
            obj, created = CodingProblem.objects.get_or_create(
                slug=p["slug"],
                defaults={
                    "title": p["title"],
                    "difficulty": p["difficulty"],
                    "description": p["description"],
                    "examples": p["examples"],
                    "constraints": p["constraints"],
                    "starter_code": p["starter_code"],
                    "test_cases": p["test_cases"],
                    "tags": p["tags"]
                }
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} new Coding problems."))
