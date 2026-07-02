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
    },
    {
        "slug": "fizz-buzz",
        "title": "Fizz Buzz",
        "difficulty": "easy",
        "description": "Given an integer n, return a string array answer (1-indexed) where:\n- answer[i] == \"FizzBuzz\" if i is divisible by 3 and 5.\n- answer[i] == \"Fizz\" if i is divisible by 3.\n- answer[i] == \"Buzz\" if i is divisible by 5.\n- answer[i] == str(i) if none of the above conditions are true.",
        "examples": [
            {
                "input": "n = 3",
                "output": "[\"1\",\"2\",\"Fizz\"]"
            },
            {
                "input": "n = 5",
                "output": "[\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]"
            }
        ],
        "constraints": [
            "1 <= n <= 10^4"
        ],
        "starter_code": {
            "javascript": "function fizzBuzz(n) {\n    // Write your solution here\n    \n}",
            "python": "def fizz_buzz(n):\n    # Write your solution here\n    pass"
        },
        "test_cases": [
            {
                "input": {"n": 3},
                "expected_output": ["1", "2", "Fizz"]
            },
            {
                "input": {"n": 5},
                "expected_output": ["1", "2", "Fizz", "4", "Buzz"]
            }
        ],
        "tags": ["math", "simulation"]
    },
    {
        "slug": "reverse-string",
        "title": "Reverse String",
        "difficulty": "easy",
        "description": "Write a function that reverses a string. The input string is given as an array of characters s.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.",
        "examples": [
            {
                "input": "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]",
                "output": "[\"o\",\"l\",\"l\",\"e\",\"h\"]"
            }
        ],
        "constraints": [
            "1 <= s.length <= 10^5",
            "s[i] is a printable ascii character."
        ],
        "starter_code": {
            "javascript": "function reverseString(s) {\n    // Write your solution here\n    \n}",
            "python": "def reverse_string(s):\n    # Write your solution here\n    pass"
        },
        "test_cases": [
            {
                "input": {"s": ["h", "e", "l", "l", "o"]},
                "expected_output": ["o", "l", "l", "e", "h"]
            }
        ],
        "tags": ["two-pointers", "string"]
    },
    {
        "slug": "fibonacci-number",
        "title": "Fibonacci Number",
        "difficulty": "easy",
        "description": "The Fibonacci numbers, commonly denoted F(n) form a sequence, called the Fibonacci sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is:\n\nF(0) = 0, F(1) = 1\nF(n) = F(n - 1) + F(n - 2), for n > 1.\n\nGiven n, calculate F(n).",
        "examples": [
            {
                "input": "n = 2",
                "output": "1"
            },
            {
                "input": "n = 3",
                "output": "2"
            }
        ],
        "constraints": [
            "0 <= n <= 30"
        ],
        "starter_code": {
            "javascript": "function fib(n) {\n    // Write your solution here\n    \n}",
            "python": "def fib(n):\n    # Write your solution here\n    pass"
        },
        "test_cases": [
            {
                "input": {"n": 2},
                "expected_output": 1
            },
            {
                "input": {"n": 3},
                "expected_output": 2
            },
            {
                "input": {"n": 4},
                "expected_output": 3
            }
        ],
        "tags": ["math", "dynamic-programming", "recursion"]
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
