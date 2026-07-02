from django.core.management.base import BaseCommand
from api.models import MCQQuestion

MCQ_SEED_DATA = [
    # Logical Reasoning
    {
        "category": "logical",
        "question_text": "If the day after tomorrow is Sunday, what day was yesterday?",
        "options": {
            "A": "Wednesday",
            "B": "Thursday",
            "C": "Friday",
            "D": "Saturday"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["calendar", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        "options": {
            "A": "(1/3)",
            "B": "(1/8)",
            "C": "(2/8)",
            "D": "(1/16)"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["series", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Find the next number in the series: 3, 6, 11, 18, 27, ?",
        "options": {
            "A": "36",
            "B": "38",
            "C": "40",
            "D": "42"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["series", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Introducing a boy, a girl said, 'He is the son of the daughter of the father of my uncle.' How is the boy related to the girl?",
        "options": {
            "A": "Brother",
            "B": "Nephew",
            "C": "Uncle",
            "D": "Son-in-law"
        },
        "correct_option": "A",
        "difficulty": "medium",
        "tags": ["blood-relations", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "If MADRAS is coded as NBESBT, how is BOMBAY coded in that code?",
        "options": {
            "A": "CPNCBX",
            "B": "CPNCBZ",
            "C": "CPOCBZ",
            "D": "CQOCBZ"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["coding-decoding", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Three of the following four are alike in a certain way and so form a group. Which is the one that does not belong to that group?",
        "options": {
            "A": "Peach",
            "B": "Apricot",
            "C": "Pomegranate",
            "D": "Pear"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["classification", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "At what angle are the hands of a clock inclined at 15 minutes past 5?",
        "options": {
            "A": "58.5 degrees",
            "B": "64 degrees",
            "C": "67.5 degrees",
            "D": "72.5 degrees"
        },
        "correct_option": "C",
        "difficulty": "hard",
        "tags": ["clocks", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "In a row of 40 students facing North, Amit is 11th from the right end. What is his position from the left end?",
        "options": {
            "A": "29th",
            "B": "30th",
            "C": "31st",
            "D": "32nd"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["ranking", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "If 1st January 2012 was a Sunday, what was the day of the week on 1st January 2013?",
        "options": {
            "A": "Monday",
            "B": "Tuesday",
            "C": "Wednesday",
            "D": "Thursday"
        },
        "correct_option": "B",
        "difficulty": "hard",
        "tags": ["calendar", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Find the odd one out from the given numbers: 27, 64, 125, 144, 216.",
        "options": {
            "A": "27",
            "B": "64",
            "C": "144",
            "D": "216"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["odd-one-out", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Statements: All bags are pockets. All pockets are pouches. Conclusions: I. All bags are pouches. II. Some pockets are bags.",
        "options": {
            "A": "Only conclusion I follows",
            "B": "Only conclusion II follows",
            "C": "Both conclusion I and II follow",
            "D": "Neither I nor II follows"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["syllogism", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "Point A is 5m west of point B. Point C is 10m south of point B. Point D is 5m east of point C. In which direction is point D with respect to point A?",
        "options": {
            "A": "South-East",
            "B": "South-West",
            "C": "North-East",
            "D": "South"
        },
        "correct_option": "A",
        "difficulty": "medium",
        "tags": ["directions", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "If A + B means A is the brother of B; A - B means A is the sister of B; and A * B means A is the father of B. Which of the following means C is the son of M?",
        "options": {
            "A": "M * C - D",
            "B": "M * D - C",
            "C": "M * C + D",
            "D": "C * M + D"
        },
        "correct_option": "C",
        "difficulty": "hard",
        "tags": ["blood-relations", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "If 'CLINT' is coded as '24-15-18-13-7' in a code language, how will 'BRUCE' be coded?",
        "options": {
            "A": "25-9-6-24-22",
            "B": "25-8-5-23-21",
            "C": "24-9-6-24-22",
            "D": "25-9-6-24-21"
        },
        "correct_option": "A",
        "difficulty": "hard",
        "tags": ["coding-decoding", "reasoning"]
    },
    {
        "category": "logical",
        "question_text": "A man walks 3 km North, then turns left and goes 2 km. He again turns left and goes 3 km. He then turns right and walks straight. In which direction is he walking now?",
        "options": {
            "A": "East",
            "B": "West",
            "C": "North",
            "D": "South"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["directions", "reasoning"]
    },

    # Quantitative Aptitude
    {
        "category": "quantitative",
        "question_text": "A train 120 m long crosses a pole in 6 seconds. Find its speed in km/h.",
        "options": {
            "A": "54 km/h",
            "B": "60 km/h",
            "C": "72 km/h",
            "D": "80 km/h"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["speed-distance", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A is twice as old as B. Five years ago, A was three times as old as B. What is A's age now?",
        "options": {
            "A": "15",
            "B": "18",
            "C": "20",
            "D": "25"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["ages", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A sum of money at simple interest amounts to Rs. 815 in 3 years and to Rs. 854 in 4 years. The sum is:",
        "options": {
            "A": "Rs. 650",
            "B": "Rs. 690",
            "C": "Rs. 698",
            "D": "Rs. 700"
        },
        "correct_option": "C",
        "difficulty": "hard",
        "tags": ["simple-interest", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "If 15 men can complete a work in 20 days, how many days will 25 men take to complete the same work?",
        "options": {
            "A": "10 days",
            "B": "12 days",
            "C": "14 days",
            "D": "16 days"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["time-work", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "The average of 5 consecutive odd numbers is 61. What is the difference between the highest and lowest numbers?",
        "options": {
            "A": "4",
            "B": "8",
            "C": "12",
            "D": "16"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["averages", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A shopkeeper sells an article at a loss of 12.5%. If he had sold it for Rs. 52.50 more, he would have gained 6%. The cost price of the article is:",
        "options": {
            "A": "Rs. 250",
            "B": "Rs. 280",
            "C": "Rs. 300",
            "D": "Rs. 320"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["profit-loss", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "What is the probability of getting a sum of 9 from two throws of a single fair dice?",
        "options": {
            "A": "1/6",
            "B": "1/8",
            "C": "1/9",
            "D": "1/12"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["probability", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A bag contains 5 red, 8 blue, and 7 green balls. If two balls are drawn at random, what is the probability that both are blue?",
        "options": {
            "A": "14/95",
            "B": "14/190",
            "C": "8/20",
            "D": "28/95"
        },
        "correct_option": "A",
        "difficulty": "hard",
        "tags": ["probability", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "The ratio of the speed of a boat in still water to that of the stream is 6:1. If the boat takes 4 hours to go 35 km downstream, how long will it take to return upstream?",
        "options": {
            "A": "5 hours",
            "B": "5.6 hours",
            "C": "6 hours",
            "D": "6.4 hours"
        },
        "correct_option": "B",
        "difficulty": "hard",
        "tags": ["boats-streams", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "The population of a town increases by 10% in the first year and decreases by 10% in the second year. If the current population is 19,800, what was it two years ago?",
        "options": {
            "A": "19,000",
            "B": "20,000",
            "C": "21,000",
            "D": "22,000"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["percentage", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "Two pipes A and B can fill a tank in 20 minutes and 30 minutes respectively. If both pipes are opened together, the tank will be filled in:",
        "options": {
            "A": "10 minutes",
            "B": "12 minutes",
            "C": "15 minutes",
            "D": "25 minutes"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["pipes-cisterns", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A sum of Rs. 10,000 is invested for 2 years at 10% per annum compound interest, compounded annually. What is the interest earned?",
        "options": {
            "A": "Rs. 2,000",
            "B": "Rs. 2,100",
            "C": "Rs. 2,200",
            "D": "Rs. 2,500"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["compound-interest", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "In how many different ways can the letters of the word 'LEADING' be arranged so that the vowels always come together?",
        "options": {
            "A": "360",
            "B": "480",
            "C": "720",
            "D": "120"
        },
        "correct_option": "C",
        "difficulty": "hard",
        "tags": ["permutations", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "A mixture of 40 liters of milk and water contains 10% water. How much water must be added to make it 20% water?",
        "options": {
            "A": "4 liters",
            "B": "5 liters",
            "C": "6 liters",
            "D": "8 liters"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["mixtures", "quantitative"]
    },
    {
        "category": "quantitative",
        "question_text": "The average score of a batsman in 10 matches is 42. In the 11th match, he scores 75 runs. What is his new average?",
        "options": {
            "A": "43.5",
            "B": "44",
            "C": "45",
            "D": "46"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["averages", "quantitative"]
    },

    # Verbal Ability
    {
        "category": "verbal",
        "question_text": "Choose the synonym of 'Ephemeral'.",
        "options": {
            "A": "Lasting",
            "B": "Brief",
            "C": "Eternal",
            "D": "Hidden"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["synonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Choose the antonym of 'Amicable'.",
        "options": {
            "A": "Friendly",
            "B": "Hostile",
            "C": "Polite",
            "D": "Understanding"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["antonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Select the option that is spelled correctly:",
        "options": {
            "A": "Accomodate",
            "B": "Accomodate",
            "C": "Accommodate",
            "D": "Acomodate"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["spelling", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Complete the sentence: 'She had a strong _______ to work under stressful conditions.'",
        "options": {
            "A": "aversion",
            "B": "capacity",
            "C": "inclination",
            "D": "capability"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["fill-in-the-blanks", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Identify the word that is closest in meaning to 'Pragmatic'.",
        "options": {
            "A": "Idealistic",
            "B": "Practical",
            "C": "Unreasonable",
            "D": "Optimistic"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["synonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Choose the word which is opposite in meaning to 'Obsolete'.",
        "options": {
            "A": "Outdated",
            "B": "Modern",
            "C": "Extinct",
            "D": "Rigid"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["antonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Fill in the blank: 'The manager was _______ with the progress of the team, as they met all deadlines.'",
        "options": {
            "A": "disappointed",
            "B": "satisfied",
            "C": "annoyed",
            "D": "suspicious"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["fill-in-the-blanks", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Identify the grammatically correct sentence:",
        "options": {
            "A": "Everyone should bring their own laptop.",
            "B": "Everyone should bring his or her own laptop.",
            "C": "Everyone should bring they're own laptop.",
            "D": "Everyone should bring there own laptop."
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["grammar", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Choose the correct meaning of the idiom: 'Spill the beans'.",
        "options": {
            "A": "To drop something valuable",
            "B": "To reveal a secret accidentally or prematurely",
            "C": "To create a mess",
            "D": "To start a conversation"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["idioms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Complete the sentence: 'Despite his best efforts, he _______ fail the examination.'",
        "options": {
            "A": "nonetheless",
            "B": "still did",
            "C": "nevertheless",
            "D": "did not"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["conjunctions", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Select the word that is correctly spelled:",
        "options": {
            "A": "Conscientious",
            "B": "Consciencious",
            "C": "Consientious",
            "D": "Conscientous"
        },
        "correct_option": "A",
        "difficulty": "hard",
        "tags": ["spelling", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Choose the synonym for 'Meticulous'.",
        "options": {
            "A": "Careless",
            "B": "Detailed and careful",
            "C": "Hasty",
            "D": "Aggressive"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["synonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Choose the antonym for 'Benevolent'.",
        "options": {
            "A": "Kind",
            "B": "Generous",
            "C": "Malevolent",
            "D": "Friendly"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["antonyms", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "What is the correct meaning of the word 'Alleviate'?",
        "options": {
            "A": "To make worse",
            "B": "To relieve or lessen pain/stress",
            "C": "To elevate",
            "D": "To forget"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["definitions", "verbal"]
    },
    {
        "category": "verbal",
        "question_text": "Complete the analogy: 'Acquit' is to 'Sentence' as 'Praise' is to:",
        "options": {
            "A": "Reward",
            "B": "Criticize",
            "C": "Accept",
            "D": "Release"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["analogy", "verbal"]
    },

    # Technical General
    {
        "category": "technical_general",
        "question_text": "What is the time complexity of searching in a balanced Binary Search Tree?",
        "options": {
            "A": "O(1)",
            "B": "O(log n)",
            "C": "O(n)",
            "D": "O(n log n)"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["dsa", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which of the following is NOT a relational database?",
        "options": {
            "A": "MySQL",
            "B": "PostgreSQL",
            "C": "MongoDB",
            "D": "Oracle"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["databases", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which layer of the OSI model is responsible for routing packets?",
        "options": {
            "A": "Data Link Layer",
            "B": "Network Layer",
            "C": "Transport Layer",
            "D": "Application Layer"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["networking", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "In JavaScript, what does 'typeof null' return?",
        "options": {
            "A": "'null'",
            "B": "'undefined'",
            "C": "'object'",
            "D": "'number'"
        },
        "correct_option": "C",
        "difficulty": "medium",
        "tags": ["javascript", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "What is the primary purpose of an Index in a database table?",
        "options": {
            "A": "To secure tables from SQL injection",
            "B": "To decrease space used by the tables",
            "C": "To speed up data retrieval operations",
            "D": "To perform calculations on columns"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["databases", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which HTTP status code represents a 'Bad Gateway' error?",
        "options": {
            "A": "400",
            "B": "404",
            "C": "500",
            "D": "502"
        },
        "correct_option": "D",
        "difficulty": "easy",
        "tags": ["http", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "What do the ACID properties in database transactions stand for?",
        "options": {
            "A": "Atomicity, Consistency, Isolation, Durability",
            "B": "Availability, Consistency, Isolation, Dependency",
            "C": "Accuracy, Completeness, Integrity, Durability",
            "D": "Atomicity, Concurrency, Isolation, Distribution"
        },
        "correct_option": "A",
        "difficulty": "medium",
        "tags": ["databases", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which data structure operates on a Last In First Out (LIFO) principle?",
        "options": {
            "A": "Queue",
            "B": "Stack",
            "C": "Heap",
            "D": "Linked List"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["dsa", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "In Git, which command is used to stage changes for a commit?",
        "options": {
            "A": "git push",
            "B": "git commit",
            "C": "git add",
            "D": "git checkout"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["git", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "What is the default port number of the HTTPS protocol?",
        "options": {
            "A": "80",
            "B": "8080",
            "C": "443",
            "D": "8443"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["networking", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which of the following is used to resolve a domain name into an IP address?",
        "options": {
            "A": "DHCP",
            "B": "DNS",
            "C": "FTP",
            "D": "SMTP"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["networking", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "What is the purpose of Docker in software development?",
        "options": {
            "A": "To compile Python code faster",
            "B": "To isolate applications in lightweight containers",
            "C": "To serve as a database storage layer",
            "D": "To track changes in source code files"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["devops", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "In CSS, which property is used to change the text color of an element?",
        "options": {
            "A": "font-color",
            "B": "text-color",
            "C": "color",
            "D": "background-color"
        },
        "correct_option": "C",
        "difficulty": "easy",
        "tags": ["css", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "Which programming paradigm does React primarily follow for UI component state updates?",
        "options": {
            "A": "Imperative programming",
            "B": "Declarative programming",
            "C": "Procedural programming",
            "D": "Low-level system programming"
        },
        "correct_option": "B",
        "difficulty": "medium",
        "tags": ["react", "technical"]
    },
    {
        "category": "technical_general",
        "question_text": "What is the main difference between GET and POST HTTP methods?",
        "options": {
            "A": "GET is faster, POST is slower",
            "B": "GET requests carry parameters in the URL; POST requests carry parameters in the request body",
            "C": "GET is used for writing data, POST is for reading",
            "D": "There is no difference"
        },
        "correct_option": "B",
        "difficulty": "easy",
        "tags": ["http", "technical"]
    }
]

class Command(BaseCommand):
    help = "Seeds database with MCQ / Aptitude questions"

    def handle(self, *args, **options):
        self.stdout.write("Seeding MCQ questions...")
        count = 0
        for q in MCQ_SEED_DATA:
            # Avoid duplicates by checking if the question text already exists
            obj, created = MCQQuestion.objects.get_or_create(
                question_text=q["question_text"],
                defaults={
                    "category": q["category"],
                    "options": q["options"],
                    "correct_option": q["correct_option"],
                    "difficulty": q["difficulty"],
                    "tags": q["tags"]
                }
            )
            if created:
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} new MCQ questions."))
