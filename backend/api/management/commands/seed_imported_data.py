from django.core.management.base import BaseCommand
from api.models import Company, APIKey, Session
import uuid

# Dumped Seed Data containing all existing companies, keys, and jobs
SEED_DATA = [
    {
        "id": "2ecaae80-0e9e-4acb-8aee-04ae44ea1a05",
        "name": "yuvraj",
        "email": "yuvraj@company.com",
        "password_hash": "$2b$12$CxZ.hnXg75f.1Ws4spR6iezPiG7PPd7JfWZj0RneWbwcQT4iV2IEi",
        "tier": "free",
        "is_active": True,
        "industry": None,
        "hq_location": None,
        "company_size": None,
        "founded_year": None,
        "website_url": None,
        "about": None,
        "logo_path": "https://logos.hunter.io/google.com",
        "slug": "yuvraj",
        "api_keys": [
            {
                "id": "fe782370-9b53-4926-b977-94aeb89dcaca",
                "key_name": "Default Key",
                "secret_key": "vish_live_vk6apvmsGJ2u23yugoogPPlhBly1wjxO",
                "public_key": "vish_pub_etQqq7Na8rFKUmp6nbF_6CxYekGegyMf",
                "environment": "production",
                "is_active": False
            },
            {
                "id": "d7ccd627-8411-4601-8115-cb9d9b4367cb",
                "key_name": "new key ",
                "secret_key": "vish_live_TkDiiEwPcyEAeMU_14LlBvR0uTnu85a-",
                "public_key": "vish_pub_bVaEWkHmbQTUV62n8lV6wXBm8F3QQd7q",
                "environment": "production",
                "is_active": False
            },
            {
                "id": "3060edf0-6d86-493c-9dc6-54409e1d81ea",
                "key_name": "new",
                "secret_key": "vish_live_34Z8SlM8t_AeGxfyAq4m7WYZuyhl5EUW",
                "public_key": "vish_pub_9xJjj8_XdMQXHeq7Q3Yw2zrogCkrX_Qa",
                "environment": "production",
                "is_active": False
            },
            {
                "id": "10766ede-a07e-4574-9fba-913a8e33ef46",
                "key_name": "new",
                "secret_key": "vish_live_eKluSeJrtBsFQGY2A9wMmRWYWSfVou_6",
                "public_key": "vish_pub_IyrIa80NddYt-BXZo7aQrENynJAXoNM4",
                "environment": "production",
                "is_active": False
            }
        ],
        "jobs": [
            {
                "id": "ebd2606b-4576-4a7d-b92a-c6e22c7edd72",
                "name": "Draft Session",
                "job_title": "Draft",
                "job_description": "we need freshers ",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 0,
                    "min_match_score": 0,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": {
                    "inferred_role": "Entry-Level Position",
                    "seniority_level": "junior",
                    "required_skills": [],
                    "nice_to_have_skills": [],
                    "minimum_experience_years": 0,
                    "preferred_locations": [],
                    "key_responsibilities": [],
                    "industry": "Not specified"
                },
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "Competitive",
                "experience_level": "Mid-Level"
            },
            {
                "id": "c72d6179-da46-4425-9b7d-72d364b86248",
                "name": "Full Stack Developers ",
                "job_title": "Full Stack Dev",
                "job_description": "we need freshers ",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Python",
                        "java"
                    ],
                    "nice_to_have": [
                        "Cloud"
                    ],
                    "preferred_locations": [],
                    "min_experience": 0,
                    "min_match_score": 70,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "Competitive",
                "experience_level": "Mid-Level"
            },
            {
                "id": "ffa0ba40-3295-4f01-8ca8-5e9fae6a67a0",
                "name": "FullStack Developer",
                "job_title": "Full Stack Developer",
                "job_description": "========================================================\nJOB DESCRIPTION: FULL STACK DEVELOPER\n========================================================\nCOMPANY:        BuildFast Technologies Pvt. Ltd.\nROLE:           Full Stack Developer (Mid to Senior Level)\nLOCATION:       Bengaluru / Remote (India)\nEXPERIENCE:     3\u20136 Years\nTYPE:           Full-Time\nSALARY:         \u20b918\u201332 LPA (based on experience & skills)\nAPPLY BY:       Rolling basis\n========================================================\n\nABOUT BUILDFAST\nBuildFast is a fast-growing B2B SaaS company building workflow automation\ntools for finance and operations teams. Our platform is used by 2,000+\nbusinesses across India, SEA, and the Middle East. We're a team of 120,\nSeries B funded ($18M), and growing fast. Engineering culture: high\nownership, pragmatic tech choices, no politics.\n\n--------------------------------------------------------\nWHAT YOU'LL OWN\n--------------------------------------------------------\n- Build and ship full-stack features independently (frontend + backend + DB)\n- Design RESTful / GraphQL APIs consumed by web and mobile clients\n- Architect scalable, maintainable systems for high-growth product load\n- Collaborate with Product, Design, and DevOps teams in 2-week sprints\n- Review pull requests and raise code quality standards across the team\n- Contribute to technical roadmap and architecture decisions\n- Debug production issues and own system reliability for your area\n\n--------------------------------------------------------\nWHAT WE'RE LOOKING FOR (MUST HAVE)\n--------------------------------------------------------\n\u2705 3+ years of professional full-stack development experience\n\u2705 Advanced React.js skills (hooks, performance optimization, TypeScript)\n\u2705 Strong Node.js backend experience (Express, NestJS, or Fastify)\n\u2705 Solid database skills \u2014 PostgreSQL (schema design, indexing, query opt.)\n\u2705 Redis experience (caching, sessions, pub/sub)\n\u2705 RESTful API design \u2014 versioning, error handling, documentation\n\u2705 Docker \u2014 containerizing applications for consistent environments\n\u2705 CI/CD familiarity (GitHub Actions, Jenkins, or similar)\n\u2705 Strong Git workflow (branching, PRs, code reviews)\n\u2705 Ability to write unit and integration tests (Jest, Supertest)\n\u2705 Experience owning production systems (monitoring, alerting, RCA)\n\n--------------------------------------------------------\nGOOD TO HAVE (DIFFERENTIATORS)\n--------------------------------------------------------\n\u2b50 Experience with Next.js (SSR/SSG, App Router)\n\u2b50 GraphQL API design experience\n\u2b50 AWS experience (EC2, S3, RDS, Lambda, CloudFront)\n\u2b50 Kubernetes or container orchestration exposure\n\u2b50 WebSockets or real-time system experience\n\u2b50 Experience mentoring junior developers\n\u2b50 Open source contributions\n\u2b50 Prior experience in a product startup (Series A/B stage)\n\u2b50 Familiarity with observability tools (Datadog, Sentry, OpenTelemetry)\n\n--------------------------------------------------------\nSCORING RUBRIC (Internal \u2014 for your testing reference)\n--------------------------------------------------------\nCATEGORY                          MAX POINTS\nExperience (years + company)          25\nTechnical skill match                 30\nProject quality & scale               20\nEducation & academics                 10\nCertifications & open source           5\nCommunication (resume quality)        10\n                              TOTAL: 100\n\nEXPECTED RANKING (for parser testing):\n  RANK 1  \u2192 Nandini Kapoor  (resume_08) \u2014 Score: ~92/100\n  RANK 2  \u2192 Aarav Mehta     (resume_01) \u2014 Score: ~89/100\n  RANK 3  \u2192 Meera Iyer      (resume_04) \u2014 Score: ~78/100\n  RANK 4  \u2192 Divya Sharma    (resume_02) \u2014 Score: ~72/100\n  RANK 5  \u2192 Pooja Nambiar   (resume_10) \u2014 Score: ~55/100\n  RANK 6  \u2192 Riya Das        (resume_06) \u2014 Score: ~50/100\n  RANK 7  \u2192 Tanmay Kulkarni (resume_07) \u2014 Score: ~47/100\n  RANK 8  \u2192 Karan Verma     (resume_03) \u2014 Score: ~40/100\n  RANK 9  \u2192 Sunny Bhatia    (resume_05) \u2014 Score: ~22/100\n  RANK 10 \u2192 Harish Kumar    (resume_09) \u2014 Score: ~12/100\n\n--------------------------------------------------------\nWHAT WE OFFER\n--------------------------------------------------------\n- Salary: \u20b918\u201332 LPA + performance bonus\n- ESOPs in a Series B company with clear IPO path\n- 100% remote-friendly (core hours 10am\u20134pm IST)\n- \u20b975,000/year learning & conference budget\n- Health insurance (self + spouse + kids + parents)\n- MacBook Pro 14\" M3 provided\n- 24 days paid leave + 12 public holidays\n- Bi-annual team offsite (Goa or international)\n\n--------------------------------------------------------\nOUR TECH STACK (what you'll actually work with)\n--------------------------------------------------------\nFrontend:   React 18, Next.js 14, TypeScript, Tailwind CSS, TanStack Query\nBackend:    Node.js, NestJS, GraphQL, REST\nDatabase:   PostgreSQL (primary), MongoDB (secondary), Redis\nInfra:      AWS (ECS, RDS, CloudFront), Docker, GitHub Actions\nMonitoring: Datadog, Sentry, PagerDuty\n\n--------------------------------------------------------\nINTERVIEW PROCESS\n--------------------------------------------------------\nStep 1: Resume screening (48 hr turnaround)\nStep 2: Take-home assignment (Full-stack feature, ~4 hrs)\nStep 3: Technical interview \u2013 code review + system design (90 min)\nStep 4: Engineering Manager round \u2013 past projects + culture (60 min)\nStep 5: Offer\n\n--------------------------------------------------------\nHOW TO APPLY\n--------------------------------------------------------\nEmail: engineering-hiring@buildfast.io\nSubject: FSE Application \u2013 [Your Name] \u2013 [Years of Experience]\nInclude: Resume PDF + GitHub/Portfolio link\n\nBuildFast is an equal opportunity employer.\n========================================================\n",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "React.js",
                        "Node.js",
                        "PostgreSQL",
                        "Redis",
                        "RESTful API Design",
                        "Docker",
                        "CI/CD",
                        "Git",
                        "Unit Testing",
                        "Integration Testing"
                    ],
                    "nice_to_have": [
                        "Next.js",
                        "GraphQL",
                        "AWS",
                        "Kubernetes",
                        "WebSockets"
                    ],
                    "preferred_locations": [
                        "Bengaluru",
                        "Remote (India)"
                    ],
                    "min_experience": 3,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.46153846153846156,
                        "experience": 0.3384615384615384,
                        "location": 0.2
                    }
                },
                "inferred_skills": {
                    "inferred_role": "Full Stack Developer",
                    "seniority_level": "mid",
                    "required_skills": [
                        "React.js",
                        "Node.js",
                        "PostgreSQL",
                        "Redis",
                        "RESTful API Design",
                        "Docker",
                        "CI/CD",
                        "Git",
                        "Unit Testing",
                        "Integration Testing"
                    ],
                    "nice_to_have_skills": [
                        "Next.js",
                        "GraphQL",
                        "AWS",
                        "Kubernetes",
                        "WebSockets"
                    ],
                    "minimum_experience_years": 3,
                    "preferred_locations": [
                        "Bengaluru",
                        "Remote (India)"
                    ],
                    "key_responsibilities": [
                        "Build and ship full-stack features independently",
                        "Design RESTful / GraphQL APIs",
                        "Architect scalable, maintainable systems",
                        "Collaborate with Product, Design, and DevOps teams",
                        "Review pull requests and raise code quality standards"
                    ],
                    "industry": "B2B SaaS"
                },
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "Competitive",
                "experience_level": "Mid-Level"
            },
            {
                "id": "128c79dc-855d-45be-81c1-a7f1b942fd6a",
                "name": "Backend Software Engineer ",
                "job_title": "Backend Software Engineer",
                "job_description": "Job Title: Backend Software Engineer (Python)\n\nCompany: Yuvraj \nsalary : \u20b918k - \u20b920k\nVenu : Ahmedabad , \nEmployment Type : part-time \nJob Description:\nWe are seeking a skilled Backend Software Engineer with strong experience in Python, REST API development, and cloud infrastructure. The ideal candidate will design, build, and maintain scalable backend services, work with relational and NoSQL databases, and collaborate with cross-functional teams to deliver high-quality software.\n\nResponsibilities:\n- Design and develop RESTful APIs using Python (Django/Flask/FastAPI)\n- Build and maintain microservices architecture\n- Work with PostgreSQL, MySQL, and MongoDB databases\n- Deploy and manage applications on AWS (EC2, S3, Lambda, RDS)\n- Implement CI/CD pipelines using Docker, Jenkins, and GitHub Actions\n- Write unit and integration tests to ensure code quality\n- Optimize application performance and scalability\n- Collaborate with frontend developers and product managers\n- Participate in code reviews and agile development processes\n\nRequired Skills:\n- 3+ years of experience with Python and backend frameworks (Django, Flask, or FastAPI)\n- Strong knowledge of SQL and NoSQL databases\n- Experience with RESTful API design and microservices\n- Familiarity with AWS cloud services\n- Proficiency with Docker and containerization\n- Experience with Git version control and CI/CD pipelines\n- Understanding of software design patterns and OOP principles\n- Strong problem-solving and debugging skills\n\nPreferred Skills:\n- Experience with Kubernetes\n- Knowledge of message queues (RabbitMQ, Kafka)\n- Familiarity with GraphQL\n- Experience with Redis caching\n- Exposure to machine learning pipelines\n\nEducation:\nBachelor's degree in Computer Science, Software Engineering, or related field.\n",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Python",
                        "REST API development",
                        "Django",
                        "Flask",
                        "FastAPI",
                        "SQL",
                        "NoSQL",
                        "AWS",
                        "Docker",
                        "Git"
                    ],
                    "nice_to_have": [
                        "Kubernetes",
                        "RabbitMQ",
                        "Kafka",
                        "GraphQL",
                        "Redis"
                    ],
                    "preferred_locations": [
                        "Ahmedabad"
                    ],
                    "min_experience": 3,
                    "min_match_score": 55,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": {
                    "inferred_role": "Backend Software Engineer",
                    "seniority_level": "mid",
                    "required_skills": [
                        "Python",
                        "REST API development",
                        "Django",
                        "Flask",
                        "FastAPI",
                        "SQL",
                        "NoSQL",
                        "AWS",
                        "Docker",
                        "Git"
                    ],
                    "nice_to_have_skills": [
                        "Kubernetes",
                        "RabbitMQ",
                        "Kafka",
                        "GraphQL",
                        "Redis"
                    ],
                    "minimum_experience_years": 3,
                    "preferred_locations": [
                        "Ahmedabad"
                    ],
                    "key_responsibilities": [
                        "Design and develop RESTful APIs using Python",
                        "Build and maintain microservices architecture",
                        "Work with PostgreSQL, MySQL, and MongoDB databases",
                        "Deploy and manage applications on AWS",
                        "Implement CI/CD pipelines using Docker, Jenkins, and GitHub Actions"
                    ],
                    "industry": "",
                    "salary_range": "\u20b918k - \u20b920k",
                    "employment_type": "Part-time"
                },
                "location": "Ahmedabad",
                "employment_type": "Part-time",
                "salary_range": "\u20b918k - \u20b920k",
                "experience_level": "Mid Level"
            },
            {
                "id": "8eeb71b6-87ab-492b-9b03-a63d14d1c6ca",
                "name": "Associate Full-Stack Engineer Session",
                "job_title": "Associate Full-Stack Engineer",
                "job_description": "Job Title: Associate Full-Stack Engineer / Backend Developer (Python & AI Integration)\nCompany: QuantumSync Technologies\nLocation: Ahmedabad, Gujarat (Hybrid / Remote Option Available)\nJob Type: Full-Time\nSalary Range: \u20b94,50,000 \u2013 \u20b97,500,000 PA (Commensurate with project portfolio and internship experience)\n\nJob Description:\nWe are seeking a highly motivated and technically proficient Associate Full-Stack Engineer with a strong emphasis on backend Python architectures and modern Web AI integrations. In this role, you will help design, build, and deploy the next generation of our data-driven applications.\n\nYou will work closely with a talented engineering team to build scalable microservices, integrate powerful Large Language Model (LLM) APIs, manage diverse database systems, and maintain clean front-end interfaces. The ideal candidate has strong core computer engineering fundamentals, a passion for automation, and hands-on experience building end-to-end web applications.\n\nResponsibilities:\nDesign, develop, and maintain clean, performant backend REST APIs using Python (Flask and FastAPI).\n\nIntegrate advanced AI functionalities and automation features utilizing external endpoints like Gemini API and Groq API.\n\nBuild, update, and optimize responsive user interfaces using React, HTML, and CSS to seamlessly connect with backend systems.\n\nWork confidently across multiple database layers, configuring and querying relational systems (MySQL, SQLite, Oracle Database) as well as NoSQL solutions (MongoDB).\n\nHandle cloud asset management and hosting pipelines, deploying web services and handling media files through platforms like Render.com and Cloudinary.\n\nImplement secure user authentication flows leveraging modern protocols such as Google OAuth.\n\nWrite automated browser and end-to-end integration tests using Playwright to guarantee platform stability.\n\nUtilize Git and GitHub for version control, code documentation, and collaborating through strict peer code reviews.\n\nRequired Skills & Qualifications (Matched to Profile):\nEducation: B.E. / B.Tech in Computer Engineering, Computer Science, or a related technical discipline (LJ University or equivalent).\n\nCore Programming: Strong foundation in Python, JavaScript, Java, C, and C++, with solid object-oriented programming (OOP) principles.\n\nBackend Frameworks: Hands-on experience developing application logic with Flask and FastAPI.\n\nFrontend Stack: Practical knowledge of building interactive UI components with React, HTML5, and CSS3.\n\nDatabases: Proficiency in writing SQL queries and managing databases across MySQL, MongoDB, Oracle, and SQLite.\n\nTesting & Deployment: Familiarity with testing web applications using Playwright, and cloud hosting environments like Render.com.\n\nAI Ecosystem: Experience interacting with generative AI toolkits and LLM APIs (Gemini/Groq).\n\nPrior internship experience at a major technology firm is a significant advantage.\n\nBenefits & Perks:\nMentorship from senior software architects and AI engineers.\n\nFlexible hybrid work arrangements (open to remote).\n\nPerformance-based bonuses and clear pathways for accelerated career growth.\n\nAccess to learning credits for cloud and engineering certifications.",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1,
                        "result_announcement_date": "2026-06-20T07:26"
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2,
                        "result_announcement_date": None
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3,
                        "result_announcement_date": None
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Python",
                        "JavaScript",
                        "Flask",
                        "FastAPI",
                        "React",
                        "HTML5",
                        "CSS3",
                        "MySQL",
                        "MongoDB",
                        "Playwright"
                    ],
                    "nice_to_have": [
                        "Java",
                        "C",
                        "C++",
                        "Google OAuth",
                        "Git",
                        "GitHub"
                    ],
                    "preferred_locations": [
                        "Ahmedabad, Gujarat"
                    ],
                    "min_experience": 0,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": {
                    "inferred_role": "Associate Full-Stack Engineer",
                    "seniority_level": "junior",
                    "required_skills": [
                        "Python",
                        "JavaScript",
                        "Flask",
                        "FastAPI",
                        "React",
                        "HTML5",
                        "CSS3",
                        "MySQL",
                        "MongoDB",
                        "Playwright"
                    ],
                    "nice_to_have_skills": [
                        "Java",
                        "C",
                        "C++",
                        "Google OAuth",
                        "Git",
                        "GitHub"
                    ],
                    "minimum_experience_years": 0,
                    "preferred_locations": [
                        "Ahmedabad, Gujarat"
                    ],
                    "key_responsibilities": [
                        "Design, develop, and maintain clean, performant backend REST APIs",
                        "Integrate advanced AI functionalities and automation features",
                        "Build, update, and optimize responsive user interfaces",
                        "Work confidently across multiple database layers",
                        "Handle cloud asset management and hosting pipelines"
                    ],
                    "industry": "Technology",
                    "salary_range": "\u20b94,50,000 \u2013 \u20b97,500,000 PA",
                    "employment_type": "Full-Time"
                },
                "location": "Ahmedabad, Gujarat",
                "employment_type": "Full-Time",
                "salary_range": "\u20b94,50,000 \u2013 \u20b97,500,000 PA",
                "experience_level": "Junior Level"
            },
            {
                "id": "32e9cd2e-8b36-4401-8798-ea9391032855",
                "name": "Backend Software Engineer Session",
                "job_title": "Backend Software Engineer",
                "job_description": "Job Title: Backend Software Engineer (Python)\n\nCompany: TechNova Solutions\n\nJob Description:\nWe are seeking a skilled Backend Software Engineer with strong experience in Python, REST API development, and cloud infrastructure. The ideal candidate will design, build, and maintain scalable backend services, work with relational and NoSQL databases, and collaborate with cross-functional teams to deliver high-quality software.\n\nResponsibilities:\n- Design and develop RESTful APIs using Python (Django/Flask/FastAPI)\n- Build and maintain microservices architecture\n- Work with PostgreSQL, MySQL, and MongoDB databases\n- Deploy and manage applications on AWS (EC2, S3, Lambda, RDS)\n- Implement CI/CD pipelines using Docker, Jenkins, and GitHub Actions\n- Write unit and integration tests to ensure code quality\n- Optimize application performance and scalability\n- Collaborate with frontend developers and product managers\n- Participate in code reviews and agile development processes\n\nRequired Skills:\n- 3+ years of experience with Python and backend frameworks (Django, Flask, or FastAPI)\n- Strong knowledge of SQL and NoSQL databases\n- Experience with RESTful API design and microservices\n- Familiarity with AWS cloud services\n- Proficiency with Docker and containerization\n- Experience with Git version control and CI/CD pipelines\n- Understanding of software design patterns and OOP principles\n- Strong problem-solving and debugging skills\n\nPreferred Skills:\n- Experience with Kubernetes\n- Knowledge of message queues (RabbitMQ, Kafka)\n- Familiarity with GraphQL\n- Experience with Redis caching\n- Exposure to machine learning pipelines\n\nEducation:\nBachelor's degree in Computer Science, Software Engineering, or related field.\n",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "",
                        "order": 1,
                        "result_announcement_date": None
                    },
                    {
                        "name": "Technical Round",
                        "interviewer": "",
                        "order": 2,
                        "result_announcement_date": None
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "",
                        "order": 3,
                        "result_announcement_date": None
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Python",
                        "Backend Frameworks (Django/Flask/FastAPI)",
                        "RESTful API Design",
                        "Microservices",
                        "SQL & NoSQL Databases",
                        "AWS Cloud Services",
                        "Docker",
                        "Git",
                        "CI/CD Pipelines",
                        "Software Design Patterns & OOP"
                    ],
                    "nice_to_have": [
                        "Kubernetes",
                        "Message Queues (RabbitMQ/Kafka)",
                        "GraphQL",
                        "Redis Caching",
                        "Machine Learning Pipelines"
                    ],
                    "preferred_locations": [],
                    "min_experience": 3,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.46428571428571425,
                        "experience": 0.35,
                        "location": 0.18571428571428575
                    }
                },
                "inferred_skills": {
                    "inferred_role": "Backend Software Engineer",
                    "seniority_level": "mid",
                    "required_skills": [
                        "Python",
                        "Backend Frameworks (Django/Flask/FastAPI)",
                        "RESTful API Design",
                        "Microservices",
                        "SQL & NoSQL Databases",
                        "AWS Cloud Services",
                        "Docker",
                        "Git",
                        "CI/CD Pipelines",
                        "Software Design Patterns & OOP"
                    ],
                    "nice_to_have_skills": [
                        "Kubernetes",
                        "Message Queues (RabbitMQ/Kafka)",
                        "GraphQL",
                        "Redis Caching",
                        "Machine Learning Pipelines"
                    ],
                    "minimum_experience_years": 3,
                    "preferred_locations": [],
                    "key_responsibilities": [
                        "Design and develop RESTful APIs using Python",
                        "Build and maintain microservices architecture",
                        "Work with relational and NoSQL databases",
                        "Deploy and manage applications on AWS",
                        "Implement CI/CD pipelines"
                    ],
                    "industry": "Technology",
                    "salary_range": "Competitive",
                    "employment_type": "Full-time"
                },
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "Competitive",
                "experience_level": "Mid Level"
            }
        ]
    },
    {
        "id": "0b8b568e-e2f3-4743-bc6d-0dd27949336d",
        "name": "Test Company",
        "email": "test@company.com",
        "password_hash": "pbkdf2_sha256$260000$...",
        "tier": "free",
        "is_active": True,
        "industry": None,
        "hq_location": None,
        "company_size": None,
        "founded_year": None,
        "website_url": None,
        "about": None,
        "logo_path": "https://logos.hunter.io/google.com",
        "slug": "test-company",
        "api_keys": [
            {
                "id": "913d6a73-2ad4-4af4-b038-f444ee52d8c7",
                "key_name": "Default Key",
                "secret_key": "test_secret_key",
                "public_key": "test_public_key",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": [
            {
                "id": "094f25c3-b35c-4168-9864-351a489bc3bc",
                "name": "Test Session",
                "job_title": "Developer",
                "job_description": "We need a Python developer who knows Django.",
                "rounds": [
                    {
                        "name": "Screening",
                        "order": 1
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {},
                "inferred_skills": [],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "Competitive",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "aeac62ed-8688-4666-9e1c-4dae9a68490b",
        "name": "Acme Labs",
        "email": "hr@acmelabs.com",
        "password_hash": "$2b$12$KEclxcZQqKoiiGfE4Nf4Aefxl9AON1d4ogw8e4ic/ZQgA/fFvUD1K",
        "tier": "free",
        "is_active": True,
        "industry": "Healthcare",
        "hq_location": "San Francisco, CA",
        "company_size": "50-200",
        "founded_year": 2018,
        "website_url": "https://acmelabs.com",
        "about": "Acme Labs is a leading biotechnology firm specializing in clinical research and medical imaging analysis.",
        "logo_path": "https://logos.hunter.io/acme.com",
        "slug": "acme-labs",
        "api_keys": [],
        "jobs": [
            {
                "id": "cd4f32d0-d88f-42b8-accb-e60a5bdac20e",
                "name": "Clinical Research Coordinator Session",
                "job_title": "Clinical Research Coordinator",
                "job_description": "About the role: Manage day-to-day operations of clinical trials. Maintain study documentation and coordinate participant schedules. Act as main contact between patients and investigators.\n\nKey Requirements:\n- Clinical Trials\n- GCP\n- Data Management\n- FDA Regulations",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Clinical Trials",
                        "GCP",
                        "Data Management",
                        "FDA Regulations"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "San Francisco, CA"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Clinical Trials",
                    "GCP",
                    "Data Management",
                    "FDA Regulations"
                ],
                "location": "San Francisco, CA",
                "employment_type": "Full-time",
                "salary_range": "\u20b912-18 LPA",
                "experience_level": "Mid-Level"
            },
            {
                "id": "2ca28538-e2a4-40be-b5e3-281a0e4783ee",
                "name": "Medical Imaging Engineer Session",
                "job_title": "Medical Imaging Engineer",
                "job_description": "About the role: Develop and optimize image processing algorithms for medical diagnostics and MRI scanning platforms. Partner with clinical leads on neural scanner algorithms.\n\nKey Requirements:\n- Python\n- Computer Vision\n- PyTorch\n- Medical Imaging\n- DICOM",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Python",
                        "Computer Vision",
                        "PyTorch",
                        "Medical Imaging",
                        "DICOM"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Python",
                    "Computer Vision",
                    "PyTorch",
                    "Medical Imaging",
                    "DICOM"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b922-35 LPA",
                "experience_level": "Senior Level"
            }
        ]
    },
    {
        "id": "b4e829e4-c4aa-4251-8d1f-ce215065bcb7",
        "name": "Zenith FinTech",
        "email": "careers@zenithfin.com",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Finance",
        "hq_location": "New York, NY",
        "company_size": "200-500",
        "founded_year": 2020,
        "website_url": "https://zenithfin.com",
        "about": "Zenith FinTech builds next-generation digital banking APIs and decentralized finance protocols for institutional asset managers.",
        "logo_path": "https://logos.hunter.io/zenith.com",
        "slug": "zenith-fintech",
        "api_keys": [],
        "jobs": [
            {
                "id": "3fbf2531-fb0f-4781-8778-bb3adfd44254",
                "name": "Blockchain Developer Session",
                "job_title": "Blockchain Developer",
                "job_description": "About the role: Design and deploy smart contracts on Ethereum and EVM-compatible chains. Write gas-optimized Solidity code and perform security audits on liquidity pools.\n\nKey Requirements:\n- Solidity\n- Ethereum\n- Smart Contracts\n- Hardhat\n- Cryptography",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Solidity",
                        "Ethereum",
                        "Smart Contracts",
                        "Hardhat",
                        "Cryptography"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Solidity",
                    "Ethereum",
                    "Smart Contracts",
                    "Hardhat",
                    "Cryptography"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b925-45 LPA",
                "experience_level": "Senior Level"
            },
            {
                "id": "e4c03a09-22d9-4c43-96b0-2657fbfcf2fa",
                "name": "Risk and Compliance Analyst Session",
                "job_title": "Risk and Compliance Analyst",
                "job_description": "About the role: Review digital transactions, draft risk compliance frameworks, and oversee security policies across international payments systems.\n\nKey Requirements:\n- Financial Risk\n- Compliance\n- AML\n- KYC\n- Auditing",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Financial Risk",
                        "Compliance",
                        "AML",
                        "KYC",
                        "Auditing"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "New York, NY"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Financial Risk",
                    "Compliance",
                    "AML",
                    "KYC",
                    "Auditing"
                ],
                "location": "New York, NY",
                "employment_type": "Full-time",
                "salary_range": "\u20b914-22 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "5f9500e2-d236-4883-8fc5-ea6a7c33f23a",
        "name": "CloudGrid Systems",
        "email": "hiring@cloudgrid.io",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Engineering",
        "hq_location": "Austin, TX",
        "company_size": "100-250",
        "founded_year": 2015,
        "website_url": "https://cloudgrid.io",
        "about": "CloudGrid builds global distributed database systems and hyper-scale infrastructure engines.",
        "logo_path": "https://logos.hunter.io/cloudflare.com",
        "slug": "cloudgrid-systems",
        "api_keys": [],
        "jobs": [
            {
                "id": "73ed32b4-a764-45d6-a89f-62a343362102",
                "name": "Lead Site Reliability Engineer Session",
                "job_title": "Lead Site Reliability Engineer",
                "job_description": "About the role: Architect self-healing cloud infrastructure engines, coordinate emergency cluster responses, and optimize resource allocation scripts.\n\nKey Requirements:\n- Kubernetes\n- AWS\n- Terraform\n- Go\n- Prometheus\n- CI/CD",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Kubernetes",
                        "AWS",
                        "Terraform",
                        "Go",
                        "Prometheus",
                        "CI/CD"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Kubernetes",
                    "AWS",
                    "Terraform",
                    "Go",
                    "Prometheus",
                    "CI/CD"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b935-50 LPA",
                "experience_level": "Lead Level"
            },
            {
                "id": "391502dc-3da7-45fb-9b79-b5a6ba1d940e",
                "name": "Systems Architect Session",
                "job_title": "Systems Architect",
                "job_description": "About the role: Design low-latency database engines and concurrent network proxies. Direct key storage performance tuning benchmarks.\n\nKey Requirements:\n- C++\n- Rust\n- Distributed Systems\n- Linux Kernel\n- Concurrency",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "C++",
                        "Rust",
                        "Distributed Systems",
                        "Linux Kernel",
                        "Concurrency"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Austin, TX"
                    ],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "C++",
                    "Rust",
                    "Distributed Systems",
                    "Linux Kernel",
                    "Concurrency"
                ],
                "location": "Austin, TX",
                "employment_type": "Full-time",
                "salary_range": "\u20b940-60 LPA",
                "experience_level": "Lead Level"
            }
        ]
    },
    {
        "id": "3462946b-d327-4d1f-869e-79f6c77e2d55",
        "name": "PixelPerfect Studios",
        "email": "jobs@pixelperfect.co",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Design",
        "hq_location": "Los Angeles, CA",
        "company_size": "10-50",
        "founded_year": 2021,
        "website_url": "https://pixelperfect.co",
        "about": "PixelPerfect is a premium creative agency designing award-winning digital consumer interfaces and motion branding assets.",
        "logo_path": "https://logos.hunter.io/canva.com",
        "slug": "pixelperfect-studios",
        "api_keys": [],
        "jobs": [
            {
                "id": "90259a71-2c1a-4b83-ab3b-57fea77d8a57",
                "name": "Lead UX/UI Designer Session",
                "job_title": "Lead UX/UI Designer",
                "job_description": "About the role: Own user experience design for high-traffic mobile web applications. Construct design systems, high-fidelity prototypes, and lead user testing programs.\n\nKey Requirements:\n- Figma\n- User Research\n- Wireframing\n- Design Systems\n- Prototyping",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Figma",
                        "User Research",
                        "Wireframing",
                        "Design Systems",
                        "Prototyping"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Figma",
                    "User Research",
                    "Wireframing",
                    "Design Systems",
                    "Prototyping"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b916-26 LPA",
                "experience_level": "Senior Level"
            },
            {
                "id": "25d8fb40-75fc-45f7-a39e-71bbd3972795",
                "name": "Motion Graphics Designer Session",
                "job_title": "Motion Graphics Designer",
                "job_description": "About the role: Produce visually stunning keyframe animations, video branding clips, and vector animations for marketing launches.\n\nKey Requirements:\n- After Effects\n- Illustrator\n- Cinema 4D\n- Keyframe Animation\n- Branding",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "After Effects",
                        "Illustrator",
                        "Cinema 4D",
                        "Keyframe Animation",
                        "Branding"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Los Angeles, CA"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "After Effects",
                    "Illustrator",
                    "Cinema 4D",
                    "Keyframe Animation",
                    "Branding"
                ],
                "location": "Los Angeles, CA",
                "employment_type": "Full-time",
                "salary_range": "\u20b912-18 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "c9407677-1e15-413e-b16e-afa24943993b",
        "name": "SmartEd Solutions",
        "email": "careers@smarted.org",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Education",
        "hq_location": "Boston, MA",
        "company_size": "50-100",
        "founded_year": 2017,
        "website_url": "https://smarted.org",
        "about": "SmartEd develops interactive digital curriculum software and virtual math-learning environments for public schools.",
        "logo_path": "https://logos.hunter.io/duolingo.com",
        "slug": "smarted-solutions",
        "api_keys": [],
        "jobs": [
            {
                "id": "e88e5a16-d8a4-4ddc-87ac-5328fb3fd3e6",
                "name": "Senior Instructional Designer Session",
                "job_title": "Senior Instructional Designer",
                "job_description": "About the role: Design interactive learning layouts for curriculum platforms, partner with teachers on online lesson pacing, and audit student engagement scores.\n\nKey Requirements:\n- Instructional Design\n- LMS\n- E-learning\n- Curriculum Mapping\n- Storyline",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Instructional Design",
                        "LMS",
                        "E-learning",
                        "Curriculum Mapping",
                        "Storyline"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Instructional Design",
                    "LMS",
                    "E-learning",
                    "Curriculum Mapping",
                    "Storyline"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b910-16 LPA",
                "experience_level": "Senior Level"
            },
            {
                "id": "50d05158-b0a8-49c2-be78-c37937a1a6c8",
                "name": "E-learning Curriculum Developer Session",
                "job_title": "E-learning Curriculum Developer",
                "job_description": "About the role: Write educational content, design interactive quizzes, and customize learning scripts for our primary math dashboard portal.\n\nKey Requirements:\n- Content Development\n- Algebra\n- LMS Integration\n- Creative Writing",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Content Development",
                        "Algebra",
                        "LMS Integration",
                        "Creative Writing"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Boston, MA"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Content Development",
                    "Algebra",
                    "LMS Integration",
                    "Creative Writing"
                ],
                "location": "Boston, MA",
                "employment_type": "Full-time",
                "salary_range": "\u20b98-14 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "985fc515-31e4-417b-ba0c-6032631047aa",
        "name": "GrowthEngine Media",
        "email": "careers@growthengine.com",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Marketing",
        "hq_location": "New York, NY",
        "company_size": "20-100",
        "founded_year": 2019,
        "website_url": "https://growthengine.com",
        "about": "GrowthEngine is a performance marketing team helping B2B SaaS applications scale using hyper-targeted digital media buys.",
        "logo_path": "https://logos.hunter.io/mailchimp.com",
        "slug": "growthengine-media",
        "api_keys": [],
        "jobs": [
            {
                "id": "450cd966-b2b4-4041-a452-6f63011b419a",
                "name": "Growth Marketing Manager Session",
                "job_title": "Growth Marketing Manager",
                "job_description": "About the role: Manage multi-channel paid acquisition budgets (Meta, Google, LinkedIn). Optimize click-through ratios, conversion scores, and CAC tracking parameters.\n\nKey Requirements:\n- Paid Ads\n- Google Analytics\n- A/B Testing\n- Copywriting\n- Excel",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Paid Ads",
                        "Google Analytics",
                        "A/B Testing",
                        "Copywriting",
                        "Excel"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "New York, NY"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Paid Ads",
                    "Google Analytics",
                    "A/B Testing",
                    "Copywriting",
                    "Excel"
                ],
                "location": "New York, NY",
                "employment_type": "Full-time",
                "salary_range": "\u20b912-20 LPA",
                "experience_level": "Mid-Level"
            },
            {
                "id": "3ea4391d-5f7a-448e-bca3-a5029c90f12b",
                "name": "SEO Specialist Session",
                "job_title": "SEO Specialist",
                "job_description": "About the role: Direct keyword research campaigns, optimize schema markers, audit backlink scores, and draft organic growth briefs for product engineering teams.\n\nKey Requirements:\n- SEO\n- Semrush\n- Keyword Research\n- Technical SEO\n- HTML/CSS",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "SEO",
                        "Semrush",
                        "Keyword Research",
                        "Technical SEO",
                        "HTML/CSS"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "SEO",
                    "Semrush",
                    "Keyword Research",
                    "Technical SEO",
                    "HTML/CSS"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b96-10 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "7dacfcbe-eed1-42dc-a473-0b513683da52",
        "name": "Apex Logistics",
        "email": "hr@apexlogistics.com",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Operations",
        "hq_location": "Chicago, IL",
        "company_size": "500-1000",
        "founded_year": 2012,
        "website_url": "https://apexlogistics.com",
        "about": "Apex Logistics manages nationwide automated freight networks and inventory optimization hubs.",
        "logo_path": "https://logos.hunter.io/dhl.com",
        "slug": "apex-logistics",
        "api_keys": [],
        "jobs": [
            {
                "id": "6c17e3d8-17f6-4066-bd03-690f9d5db76f",
                "name": "Supply Chain Optimization Analyst Session",
                "job_title": "Supply Chain Optimization Analyst",
                "job_description": "About the role: Build optimization algorithms to minimize delivery latency, schedule fleet shipments, and analyze routing costs.\n\nKey Requirements:\n- Linear Programming\n- SQL\n- Supply Chain\n- Tableau\n- Inventory Control",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Linear Programming",
                        "SQL",
                        "Supply Chain",
                        "Tableau",
                        "Inventory Control"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Chicago, IL"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Linear Programming",
                    "SQL",
                    "Supply Chain",
                    "Tableau",
                    "Inventory Control"
                ],
                "location": "Chicago, IL",
                "employment_type": "Full-time",
                "salary_range": "\u20b914-24 LPA",
                "experience_level": "Mid-Level"
            },
            {
                "id": "cad01ad2-90a8-4550-bc1d-899592fa428c",
                "name": "Logistics Operations Manager Session",
                "job_title": "Logistics Operations Manager",
                "job_description": "About the role: Supervise day-to-day warehouse operations, monitor fulfillment cycles, and enforce safety guidelines across delivery networks.\n\nKey Requirements:\n- Warehouse Management\n- Logistics\n- Operations\n- Budgeting\n- KPI Tracking",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Warehouse Management",
                        "Logistics",
                        "Operations",
                        "Budgeting",
                        "KPI Tracking"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Dallas, TX"
                    ],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Warehouse Management",
                    "Logistics",
                    "Operations",
                    "Budgeting",
                    "KPI Tracking"
                ],
                "location": "Dallas, TX",
                "employment_type": "Full-time",
                "salary_range": "\u20b916-25 LPA",
                "experience_level": "Senior Level"
            }
        ]
    },
    {
        "id": "782913a8-6486-4801-a4ac-154aed81cbeb",
        "name": "NeuroAI Research",
        "email": "hiring@neuroai.org",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Data & AI",
        "hq_location": "Seattle, WA",
        "company_size": "50-150",
        "founded_year": 2022,
        "website_url": "https://neuroai.org",
        "about": "NeuroAI Research designs self-supervised vision models and generative networks for autonomous robotics systems.",
        "logo_path": "https://logos.hunter.io/openai.com",
        "slug": "neuroai-research",
        "api_keys": [],
        "jobs": [
            {
                "id": "a7d0a8f2-b824-4275-ac3b-9e11dbc3722c",
                "name": "Machine Learning Research Scientist Session",
                "job_title": "Machine Learning Research Scientist",
                "job_description": "About the role: Publish research on self-supervised vision representations. Train large models on GPU clusters and publish model evaluation reports.\n\nKey Requirements:\n- PyTorch\n- Deep Learning\n- Transformers\n- Computer Vision\n- Git",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "PyTorch",
                        "Deep Learning",
                        "Transformers",
                        "Computer Vision",
                        "Git"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "PyTorch",
                    "Deep Learning",
                    "Transformers",
                    "Computer Vision",
                    "Git"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b930-55 LPA",
                "experience_level": "Senior Level"
            },
            {
                "id": "071a1b5e-ab72-4491-b1b2-2b95aaf525e6",
                "name": "Data Engineer Session",
                "job_title": "Data Engineer",
                "job_description": "About the role: Construct high-throughput data cleaning pipelines. Manage Petabyte-scale storage engines, data schemas, and analytics warehouses.\n\nKey Requirements:\n- Spark\n- Python\n- SQL\n- Airflow\n- Data Warehousing\n- AWS",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Spark",
                        "Python",
                        "SQL",
                        "Airflow",
                        "Data Warehousing",
                        "AWS"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Seattle, WA"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Spark",
                    "Python",
                    "SQL",
                    "Airflow",
                    "Data Warehousing",
                    "AWS"
                ],
                "location": "Seattle, WA",
                "employment_type": "Full-time",
                "salary_range": "\u20b920-35 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "252ce3ac-25b2-4916-a57d-94556c388842",
        "name": "Bright Horizon Capital",
        "email": "careers@brighthorizon.com",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Finance",
        "hq_location": "London, UK",
        "company_size": "100-300",
        "founded_year": 2014,
        "website_url": "https://brighthorizon.com",
        "about": "Bright Horizon is a global wealth management fund trading commodities and high-growth equity options.",
        "logo_path": "https://logos.hunter.io/robinhood.com",
        "slug": "bright-horizon-capital",
        "api_keys": [],
        "jobs": [
            {
                "id": "5933a23e-3502-4e77-92e4-2ef13a621840",
                "name": "Investment Banking Analyst Session",
                "job_title": "Investment Banking Analyst",
                "job_description": "About the role: Perform comprehensive company valuations, build financial projections, and assist in M&A advisory transactions.\n\nKey Requirements:\n- Financial Modeling\n- Corporate Finance\n- M&A\n- Valuation\n- PowerPoint",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Financial Modeling",
                        "Corporate Finance",
                        "M&A",
                        "Valuation",
                        "PowerPoint"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "London, UK"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Financial Modeling",
                    "Corporate Finance",
                    "M&A",
                    "Valuation",
                    "PowerPoint"
                ],
                "location": "London, UK",
                "employment_type": "Full-time",
                "salary_range": "\u20b918-28 LPA",
                "experience_level": "Mid-Level"
            },
            {
                "id": "1ebfa2c2-2107-4023-8af3-98d8604f6a10",
                "name": "Portfolio Manager Session",
                "job_title": "Portfolio Manager",
                "job_description": "About the role: Direct commodities portfolio allocations, monitor daily risk tolerances, and generate quarterly report metrics.\n\nKey Requirements:\n- Portfolio Management\n- Asset Allocation\n- Risk Management\n- Trading",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Portfolio Management",
                        "Asset Allocation",
                        "Risk Management",
                        "Trading"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [],
                    "min_experience": 5,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Portfolio Management",
                    "Asset Allocation",
                    "Risk Management",
                    "Trading"
                ],
                "location": "Remote",
                "employment_type": "Full-time",
                "salary_range": "\u20b930-50 LPA",
                "experience_level": "Senior Level"
            }
        ]
    },
    {
        "id": "aa5a671e-03c2-49a3-ac3a-ca3412124dc9",
        "name": "Helix BioMed",
        "email": "hr@helixbiomed.com",
        "password_hash": "$2b$12$zeF5r4KFvAxSZqe.0LEBGedKRoW3bdWvK4LpdKvH.RCvR5C6BcO.W",
        "tier": "free",
        "is_active": True,
        "industry": "Healthcare",
        "hq_location": "Boston, MA",
        "company_size": "200-400",
        "founded_year": 2016,
        "website_url": "https://helixbiomed.com",
        "about": "Helix BioMed integrates high-throughput gene sequencing platforms with clinical oncology diagnostics databases.",
        "logo_path": "https://logos.hunter.io/helix.com",
        "slug": "helix-biomed",
        "api_keys": [],
        "jobs": [
            {
                "id": "fdfeee18-91e5-4055-b592-8834bf5c01d7",
                "name": "Bioinformatics Software Engineer Session",
                "job_title": "Bioinformatics Software Engineer",
                "job_description": "About the role: Build high-throughput gene sequencing analysis pipelines. Customize processing algorithms for genomics oncology databases.\n\nKey Requirements:\n- Genomics\n- Python\n- Bioinformatics\n- Nextflow\n- R",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Genomics",
                        "Python",
                        "Bioinformatics",
                        "Nextflow",
                        "R"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Boston, MA"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Genomics",
                    "Python",
                    "Bioinformatics",
                    "Nextflow",
                    "R"
                ],
                "location": "Boston, MA",
                "employment_type": "Full-time",
                "salary_range": "\u20b920-38 LPA",
                "experience_level": "Mid-Level"
            },
            {
                "id": "45d6e394-5903-4fa3-a5d6-72af7516fb6f",
                "name": "Diagnostic Lab Lead Session",
                "job_title": "Diagnostic Lab Lead",
                "job_description": "About the role: Oversee diagnostic lab workflows, run automated analyzer tests, and ensure full compliance with CAP regulations.\n\nKey Requirements:\n- Laboratory Operations\n- Oncology Diagnostics\n- Compliance\n- CAP Regulations",
                "rounds": [
                    {
                        "name": "Screening Round",
                        "interviewer": "HR Team",
                        "order": 1
                    },
                    {
                        "name": "Technical Interview",
                        "interviewer": "Engineering Lead",
                        "order": 2
                    },
                    {
                        "name": "HR Round",
                        "interviewer": "Recruitment Head",
                        "order": 3
                    }
                ],
                "current_round_index": 0,
                "status": "active",
                "criteria": {
                    "required_skills": [
                        "Laboratory Operations",
                        "Oncology Diagnostics",
                        "Compliance",
                        "CAP Regulations"
                    ],
                    "nice_to_have": [],
                    "preferred_locations": [
                        "Chicago, IL"
                    ],
                    "min_experience": 2,
                    "min_match_score": 60,
                    "weights": {
                        "skills": 0.5,
                        "experience": 0.3,
                        "location": 0.2
                    }
                },
                "inferred_skills": [
                    "Laboratory Operations",
                    "Oncology Diagnostics",
                    "Compliance",
                    "CAP Regulations"
                ],
                "location": "Chicago, IL",
                "employment_type": "Full-time",
                "salary_range": "\u20b915-22 LPA",
                "experience_level": "Mid-Level"
            }
        ]
    },
    {
        "id": "c315ba0f-a518-4b95-b933-21f451365d6e",
        "name": "Google",
        "email": "recruiter@google.com",
        "password_hash": "$2b$12$q1RQm.qkehUByfEGLQt2K.cqwMICe5pkA3UXTKUttTLqCk3OVk/AK",
        "tier": "enterprise",
        "is_active": True,
        "industry": "Technology / Search / Cloud",
        "hq_location": "Mountain View, CA",
        "company_size": "10000+ employees",
        "founded_year": 1998,
        "website_url": "https://google.com",
        "about": "Google's mission is to organize the world's information and make it universally accessible and useful.",
        "logo_path": "https://logos.hunter.io/google.com",
        "slug": "google",
        "api_keys": [
            {
                "id": "b3737a5d-1b08-4ec6-b35d-c2e7d94bb680",
                "key_name": "Default Key",
                "secret_key": "vish_live_xh1q1UQoUsCTCcMNmgYgF6dV0wT6Y52C",
                "public_key": "vish_pub_wdsL9MfrthPpBYenvaCHolqTJDWmOZqo",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": []
    },
    {
        "id": "ec3d3061-d88c-4bef-86c1-c1e19314154e",
        "name": "Microsoft",
        "email": "recruiter@microsoft.com",
        "password_hash": "$2b$12$OHeon60mK6G4HQVexykEXO3hkRGxhT/3EnXK32A5ZTU0O4Fpl/Iea",
        "tier": "enterprise",
        "is_active": True,
        "industry": "Technology / Software / Enterprise",
        "hq_location": "Redmond, WA",
        "company_size": "10000+ employees",
        "founded_year": 175,
        "website_url": "https://microsoft.com",
        "about": "Microsoft enables digital transformation for the era of an intelligent cloud and an intelligent edge.",
        "logo_path": "https://logos.hunter.io/microsoft.com",
        "slug": "microsoft",
        "api_keys": [
            {
                "id": "b1e971c2-b21b-4cf8-a16c-7cf8265d1d48",
                "key_name": "Default Key",
                "secret_key": "vish_live_mzaZ49x6jnG4WNc93CRb_V6jLnAf1Ijv",
                "public_key": "vish_pub_KXrMgNVBK2AcCX4-jX4r-Mm1ZT3EqbzS",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": []
    },
    {
        "id": "523df44a-4b8b-416b-b37d-d1d756115bb9",
        "name": "Meta",
        "email": "recruiter@meta.com",
        "password_hash": "$2b$12$.dSMu.hUh9q9IZskVmEM3eYmOTvSIUWsAaNVUC8Ll0UqWJYoUVrdG",
        "tier": "enterprise",
        "is_active": True,
        "industry": "Technology / Social Media / AI",
        "hq_location": "Menlo Park, CA",
        "company_size": "10000+ employees",
        "founded_year": 2004,
        "website_url": "https://meta.com",
        "about": "Meta builds technologies that help people connect, find communities, and grow businesses.",
        "logo_path": "https://logos.hunter.io/meta.com",
        "slug": "meta",
        "api_keys": [
            {
                "id": "eea77ad6-ab52-4ef8-bf12-f9c37334f328",
                "key_name": "Default Key",
                "secret_key": "vish_live_cmRGUpUewmh125NkIlmEjFtFUm_3me8z",
                "public_key": "vish_pub_9P7zX8AGbZLCWPwRYHav6FvWTOlBkMfI",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": []
    },
    {
        "id": "3d1bbffe-496e-4375-8c8a-ae3afae86db7",
        "name": "Workly AI",
        "email": "admin@workly.ai",
        "password_hash": "$2b$12$myaTTqi94y06hOF.FLmU7us9ZxNP1KJe4vVz.x.tkjGm2ZCoxeiUq",
        "tier": "enterprise",
        "is_active": True,
        "industry": "HR Tech / AI Recruitment",
        "hq_location": "Ahmedabad, Gujarat, India",
        "company_size": "11-50 employees",
        "founded_year": 2024,
        "website_url": "https://workly.ai",
        "about": "Workly AI is an intelligent recruiting platform that uses advanced AI agents to screen, match, and tailor candidate hiring workflows.",
        "logo_path": "https://logos.hunter.io/workday.com",
        "slug": "workly-ai",
        "api_keys": [
            {
                "id": "921f57dd-6336-43ae-89ac-735ef50f277f",
                "key_name": "Default Key",
                "secret_key": "vish_live_e3F3kgFf5zJ--6Iiwltzh1lmJJmj4fBw",
                "public_key": "vish_pub_ZKN9rVICRnYVNDwwFCt9Ex44fatVEhp7",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": []
    },
    {
        "id": "efe71213-429d-44f6-ab38-64c2c32b7671",
        "name": "Stripe",
        "email": "recruiter@stripe.com",
        "password_hash": "$2b$12$A1Iff8Y/PP7K/EaDC..eV.7BPXfVYpcTBFq4NgTJY66C1pDOecnsi",
        "tier": "enterprise",
        "is_active": True,
        "industry": "Financial Services / Fintech",
        "hq_location": "San Francisco, CA",
        "company_size": "1001-5000 employees",
        "founded_year": 2010,
        "website_url": "https://stripe.com",
        "about": "Stripe is a financial infrastructure platform for the internet.",
        "logo_path": "https://logos.hunter.io/stripe.com",
        "slug": "stripe",
        "api_keys": [
            {
                "id": "4d8b1d78-c12d-41d9-8756-95a8dd88f870",
                "key_name": "Default Key",
                "secret_key": "vish_live_wpupOwGTtCwym2X-h0iogoY0BrdG9MJs",
                "public_key": "vish_pub_v_X-zFaG4ranOy-jKucXl4KUeTLGoaUY",
                "environment": "production",
                "is_active": True
            }
        ],
        "jobs": []
    }
]

class Command(BaseCommand):
    help = "Seeds the database with companies, API keys, and jobs exported from the source DB."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting data seed execution..."))
        
        company_count = 0
        key_count = 0
        job_count = 0
        
        for cdata in SEED_DATA:
            comp_id = uuid.UUID(cdata["id"])
            email = cdata["email"]
            name = cdata["name"]
            
            # Create or update company
            company, created = Company.objects.update_or_create(
                id=comp_id,
                defaults={
                    "name": name,
                    "email": email,
                    "password_hash": cdata["password_hash"],
                    "tier": cdata["tier"],
                    "is_active": cdata["is_active"],
                    "industry": cdata["industry"],
                    "hq_location": cdata["hq_location"],
                    "company_size": cdata["company_size"],
                    "founded_year": cdata["founded_year"],
                    "website_url": cdata["website_url"],
                    "about": cdata["about"],
                    "logo_path": cdata["logo_path"]
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Company: {name}"))
            else:
                self.stdout.write(f"Updated Company: {name}")
            company_count += 1
                
            # Create or update API keys
            for kdata in cdata["api_keys"]:
                key_id = uuid.UUID(kdata["id"])
                key, k_created = APIKey.objects.update_or_create(
                    id=key_id,
                    defaults={
                        "company": company,
                        "key_name": kdata["key_name"],
                        "secret_key": kdata["secret_key"],
                        "public_key": kdata["public_key"],
                        "environment": kdata["environment"],
                        "is_active": kdata["is_active"]
                    }
                )
                if k_created:
                    key_count += 1
                    
            # Create or update Jobs (Sessions)
            for jdata in cdata["jobs"]:
                job_id = uuid.UUID(jdata["id"])
                session, j_created = Session.objects.update_or_create(
                    id=job_id,
                    defaults={
                        "company": company,
                        "name": jdata["name"],
                        "job_title": jdata["job_title"],
                        "job_description": jdata["job_description"],
                        "rounds": jdata["rounds"],
                        "current_round_index": jdata["current_round_index"],
                        "status": jdata["status"],
                        "criteria": jdata["criteria"],
                        "inferred_skills": jdata["inferred_skills"]
                    }
                )
                if j_created:
                    self.stdout.write(f"  -> Created Job: {jdata['job_title']}")
                else:
                    self.stdout.write(f"  -> Updated Job: {jdata['job_title']}")
                job_count += 1
                
            self.stdout.write("-" * 60)
            
        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded {company_count} companies, {key_count} API keys, and {job_count} jobs."
        ))