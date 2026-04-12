import json

SKILLS_DATA = {
  "metadata": {
    "version": "1.0.0",
    "description": "Vishleshan Normalization Agent - Canonical Skill Alias Dataset",
    "total_skills": 320,
    "domains": [
      "programming_languages", "web_frontend", "web_backend", "databases", "devops_cloud",
      "data_science_ml", "mobile", "testing_qa", "security", "networking",
      "project_management", "design_ux", "soft_skills", "bi_analytics", "erp_crm",
      "embedded_iot", "blockchain", "ar_vr", "game_dev", "office_productivity"
    ],
    "notes": "Each entry has a canonical_name (the normalized output) and aliases (all variations seen in resumes/JDs). Matching should be case-insensitive and punctuation-stripped."
  },
  "skills": [
    {
      "id": "LANG-001", "canonical_name": "Python", "domain": "programming_languages",
      "aliases": ["python", "Python3", "python 3", "python3.x", "python 3.x", "py", "Python2", "python 2", "python scripting", "python programming", "python development", "python coding", "cpython", "python lang", "python language", "python (3.x)", "python (2.7)", "python2.7", "python3.8", "python3.9", "python3.10", "python3.11", "python3.12"]
    },
    {
      "id": "LANG-002", "canonical_name": "JavaScript", "domain": "programming_languages",
      "aliases": ["javascript", "js", "Java Script", "javaScript", "javascript (es6)", "es6", "es7", "es8", "es2015", "es2016", "es2017", "es2018", "es2019", "es2020", "es2021", "es2022", "es2023", "ecmascript", "ecmascript 6", "ecmascript6", "vanilla js", "vanilla javascript", "core javascript", "modern javascript", "javascript programming", "js development", "client-side javascript", "browser javascript", "node javascript"]
    },
    {
      "id": "LANG-003", "canonical_name": "TypeScript", "domain": "programming_languages",
      "aliases": ["typescript", "ts", "type script", "TypeScript (TS)", "typed javascript", "typescript 4", "typescript 5", "ts lang", "microsoft typescript"]
    },
    {
      "id": "LANG-004", "canonical_name": "Java", "domain": "programming_languages",
      "aliases": ["java", "Java SE", "Java EE", "Java ME", "java programming", "java development", "core java", "advanced java", "java8", "java 8", "java 11", "java11", "java 17", "java17", "java 21", "java21", "jdk", "jvm", "javax", "openjdk", "java platform", "java language", "j2ee", "j2se", "j2me"]
    },
    {
      "id": "LANG-005", "canonical_name": "C++", "domain": "programming_languages",
      "aliases": ["c++", "cpp", "c/c++", "C Plus Plus", "cplusplus", "c++ programming", "c++11", "c++14", "c++17", "c++20", "c++23", "modern c++", "stl", "iso c++", "standard c++", "c++ development", "c++ language"]
    },
    {
      "id": "LANG-006", "canonical_name": "C", "domain": "programming_languages",
      "aliases": ["c", "c programming", "c language", "ansi c", "c99", "c11", "c17", "c18", "c programming language", "c development", "c coding", "iso c", "gnu c"]
    },
    {
      "id": "LANG-007", "canonical_name": "C#", "domain": "programming_languages",
      "aliases": ["c#", "csharp", "c sharp", "C# .NET", "c# programming", "c# development", "c# language", "dotnet c#", ".net c#", "c# (.net)", "microsoft c#", "c# 8", "c# 9", "c# 10", "c# 11", "c# 12"]
    },
    {
      "id": "LANG-008", "canonical_name": "Go", "domain": "programming_languages",
      "aliases": ["go", "golang", "go lang", "go language", "google go", "go programming", "go development", "go (golang)", "golang development", "go scripting"]
    },
    {
      "id": "LANG-009", "canonical_name": "Rust", "domain": "programming_languages",
      "aliases": ["rust", "rust lang", "rust language", "rust programming", "rust development", "rust-lang", "mozilla rust", "rust (systems programming)"]
    },
    {
      "id": "LANG-010", "canonical_name": "Kotlin", "domain": "programming_languages",
      "aliases": ["kotlin", "kotlin lang", "kotlin language", "kotlin programming", "jetbrains kotlin", "kotlin development", "kotlin (jvm)"]
    },
    {
      "id": "LANG-011", "canonical_name": "Swift", "domain": "programming_languages",
      "aliases": ["swift", "swift lang", "apple swift", "swift programming", "swift language", "swift development", "swift 5", "swift 5.x", "swift ios"]
    },
    {
      "id": "LANG-012", "canonical_name": "Ruby", "domain": "programming_languages",
      "aliases": ["ruby", "ruby lang", "ruby language", "ruby programming", "ruby development", "ruby scripting", "mri ruby", "cruby", "jruby", "ruby 3", "ruby 2"]
    },
    {
      "id": "LANG-013", "canonical_name": "PHP", "domain": "programming_languages",
      "aliases": ["php", "php scripting", "php programming", "php development", "php language", "php 7", "php 8", "php7", "php8", "php 7.4", "php 8.0", "php 8.1", "php 8.2", "hypertext preprocessor", "server-side php"]
    },
    {
      "id": "LANG-014", "canonical_name": "Scala", "domain": "programming_languages",
      "aliases": ["scala", "scala lang", "scala language", "scala programming", "scala development", "scala (jvm)", "apache scala", "typesafe scala", "scala 2", "scala 3", "dotty"]
    },
    {
      "id": "LANG-015", "canonical_name": "R", "domain": "programming_languages",
      "aliases": ["r", "r language", "r programming", "r scripting", "r statistical computing", "r programming language", "cran r", "r (statistics)", "r studio language", "statistical programming r"]
    },
    {
      "id": "LANG-016", "canonical_name": "MATLAB", "domain": "programming_languages",
      "aliases": ["matlab", "mat lab", "mathworks matlab", "matlab programming", "matlab scripting", "matlab (mathworks)", "matlab simulation", "matlab/simulink"]
    },
    {
      "id": "LANG-017", "canonical_name": "Shell Scripting", "domain": "programming_languages",
      "aliases": ["shell scripting", "bash scripting", "shell script", "bash script", "bash", "bash programming", "bash shell", "shell programming", "unix shell scripting", "linux shell scripting", "sh scripting", "ksh", "zsh scripting", "powershell scripting", "bash/shell scripting", "shell/bash", "unix scripting", "linux scripting", "bourne shell", "bash automation"]
    },
    {
      "id": "LANG-018", "canonical_name": "Perl", "domain": "programming_languages",
      "aliases": ["perl", "perl scripting", "perl programming", "perl language", "perl5", "perl 5", "perl development", "perl automation"]
    },
    {
      "id": "LANG-019", "canonical_name": "Dart", "domain": "programming_languages",
      "aliases": ["dart", "dart lang", "dart language", "dart programming", "google dart", "dart development", "dart (flutter)"]
    },
    {
      "id": "LANG-020", "canonical_name": "Haskell", "domain": "programming_languages",
      "aliases": ["haskell", "haskell programming", "haskell language", "functional haskell", "ghc haskell", "haskell development"]
    },
    {
      "id": "LANG-021", "canonical_name": "Lua", "domain": "programming_languages",
      "aliases": ["lua", "lua scripting", "lua programming", "lua language", "lua development"]
    },
    {
      "id": "LANG-022", "canonical_name": "Groovy", "domain": "programming_languages",
      "aliases": ["groovy", "apache groovy", "groovy scripting", "groovy programming", "groovy language", "groovy (jvm)", "groovy development"]
    },
    {
      "id": "LANG-023", "canonical_name": "Elixir", "domain": "programming_languages",
      "aliases": ["elixir", "elixir lang", "elixir language", "elixir programming", "elixir development", "phoenix elixir"]
    },
    {
      "id": "LANG-024", "canonical_name": "Clojure", "domain": "programming_languages",
      "aliases": ["clojure", "clojure programming", "clojure development", "clojurescript", "clj"]
    },
    {
      "id": "LANG-025", "canonical_name": "Assembly", "domain": "programming_languages",
      "aliases": ["assembly", "assembly language", "asm", "x86 assembly", "x86-64 assembly", "arm assembly", "mips assembly", "assembly programming", "low-level programming"]
    },
    {
      "id": "LANG-026", "canonical_name": "Solidity", "domain": "programming_languages",
      "aliases": ["solidity", "solidity programming", "smart contract development", "ethereum solidity", "sol", "solidity language"]
    },
    {
      "id": "LANG-027", "canonical_name": "COBOL", "domain": "programming_languages",
      "aliases": ["cobol", "cobol programming", "cobol development", "ibm cobol", "mainframe cobol", "micro focus cobol", "enterprise cobol"]
    },
    {
      "id": "LANG-028", "canonical_name": "Fortran", "domain": "programming_languages",
      "aliases": ["fortran", "fortran programming", "fortran 90", "fortran 95", "fortran 2003", "fortran 2008", "fortran language"]
    },
    {
      "id": "LANG-029", "canonical_name": "SQL", "domain": "programming_languages",
      "aliases": ["sql", "SQL language", "structured query language", "sql programming", "sql scripting", "sql querying", "sql coding", "ansi sql", "standard sql", "sql queries", "sql (structured query language)", "database sql", "relational sql"]
    },

    {
      "id": "FE-001", "canonical_name": "React", "domain": "web_frontend",
      "aliases": ["react", "reactjs", "react.js", "react js", "react framework", "react library", "react development", "react ui", "react frontend", "facebook react", "react 16", "react 17", "react 18", "react (hooks)", "react hooks", "react+redux", "react/redux", "create react app", "cra"]
    },
    {
      "id": "FE-002", "canonical_name": "Angular", "domain": "web_frontend",
      "aliases": ["angular", "angularjs", "angular.js", "angular js", "angular 2", "angular 4", "angular 6", "angular 8", "angular 10", "angular 12", "angular 14", "angular 15", "angular 16", "angular 17", "angular framework", "google angular", "angular development", "angular (typescript)", "@angular", "angular cli", "angularjs 1.x", "angular 1.x"]
    },
    {
      "id": "FE-003", "canonical_name": "Vue.js", "domain": "web_frontend",
      "aliases": ["vue", "vue.js", "vuejs", "vue js", "vue framework", "vue 2", "vue 3", "vue2", "vue3", "vuex", "nuxt", "nuxtjs", "nuxt.js", "vue development", "vue frontend", "pinia", "vue composition api"]
    },
    {
      "id": "FE-004", "canonical_name": "Next.js", "domain": "web_frontend",
      "aliases": ["next.js", "nextjs", "next js", "next", "vercel next", "next.js framework", "ssr react", "react ssr", "server-side rendering react"]
    },
    {
      "id": "FE-005", "canonical_name": "HTML", "domain": "web_frontend",
      "aliases": ["html", "html5", "html 5", "hypertext markup language", "html/css", "html & css", "html coding", "html development", "html markup", "semantic html", "html templating"]
    },
    {
      "id": "FE-006", "canonical_name": "CSS", "domain": "web_frontend",
      "aliases": ["css", "css3", "css 3", "cascading style sheets", "css styling", "css design", "css development", "css animations", "css transitions", "css layout", "responsive css", "css flexbox", "flexbox", "css grid", "grid layout", "css preprocessors", "html/css", "html & css"]
    },
    {
      "id": "FE-007", "canonical_name": "Sass", "domain": "web_frontend",
      "aliases": ["sass", "scss", "sass/scss", "syntactically awesome stylesheets", "css preprocessor", "sass styling", "scss styling"]
    },
    {
      "id": "FE-008", "canonical_name": "Tailwind CSS", "domain": "web_frontend",
      "aliases": ["tailwind", "tailwindcss", "tailwind css", "tailwind utility", "utility-first css", "tailwind design", "tailwind framework"]
    },
    {
      "id": "FE-009", "canonical_name": "Bootstrap", "domain": "web_frontend",
      "aliases": ["bootstrap", "bootstrap css", "twitter bootstrap", "bootstrap framework", "bootstrap 4", "bootstrap 5", "bootstrap design", "bootstrap ui"]
    },
    {
      "id": "FE-010", "canonical_name": "jQuery", "domain": "web_frontend",
      "aliases": ["jquery", "jquery library", "jquery framework", "jquery javascript", "jquery ui", "jquery ajax", "jquery plugins"]
    },
    {
      "id": "FE-011", "canonical_name": "Redux", "domain": "web_frontend",
      "aliases": ["redux", "redux.js", "reduxjs", "react redux", "redux toolkit", "rtk", "redux state management", "redux-thunk", "redux saga", "state management redux"]
    },
    {
      "id": "FE-012", "canonical_name": "GraphQL", "domain": "web_frontend",
      "aliases": ["graphql", "graph ql", "graphql api", "graphql client", "graphql server", "apollo graphql", "apollo client", "graphql queries", "graphql mutations", "gql", "graphql (apollo)"]
    },
    {
      "id": "FE-013", "canonical_name": "WebSocket", "domain": "web_frontend",
      "aliases": ["websocket", "websockets", "web socket", "ws", "socket programming", "real-time communication", "websocket protocol"]
    },
    {
      "id": "FE-014", "canonical_name": "Webpack", "domain": "web_frontend",
      "aliases": ["webpack", "web pack", "module bundler", "webpack bundler", "webpack config", "webpack configuration", "webpack 4", "webpack 5"]
    },
    {
      "id": "FE-015", "canonical_name": "Svelte", "domain": "web_frontend",
      "aliases": ["svelte", "svelte.js", "sveltejs", "sveltekit", "svelte kit", "svelte framework"]
    },
    {
      "id": "FE-016", "canonical_name": "Material UI", "domain": "web_frontend",
      "aliases": ["material ui", "mui", "material-ui", "material design", "google material", "react material ui", "@mui", "material components", "material design react"]
    },
    {
      "id": "FE-017", "canonical_name": "Gatsby", "domain": "web_frontend",
      "aliases": ["gatsby", "gatsby.js", "gatsbyjs", "gatsby framework", "static site gatsby", "jamstack gatsby"]
    },

    {
      "id": "BE-001", "canonical_name": "Node.js", "domain": "web_backend",
      "aliases": ["node.js", "nodejs", "node js", "node", "node.js backend", "server-side javascript", "node.js development", "node.js runtime", "node.js server", "express node", "node.js (express)", "node (v18)", "node (lts)"]
    },
    {
      "id": "BE-002", "canonical_name": "Express.js", "domain": "web_backend",
      "aliases": ["express.js", "expressjs", "express js", "express", "express framework", "express.js framework", "express.js backend", "express node.js", "expressjs (node)", "node express", "express api"]
    },
    {
      "id": "BE-003", "canonical_name": "Django", "domain": "web_backend",
      "aliases": ["django", "django framework", "python django", "django rest", "drf", "django rest framework", "django development", "django web framework", "django orm", "django (python)"]
    },
    {
      "id": "BE-004", "canonical_name": "Flask", "domain": "web_backend",
      "aliases": ["flask", "flask framework", "python flask", "flask development", "flask (python)", "flask api", "flask backend", "flask microframework", "flask rest api"]
    },
    {
      "id": "BE-005", "canonical_name": "FastAPI", "domain": "web_backend",
      "aliases": ["fastapi", "fast api", "fastapi framework", "python fastapi", "fastapi (python)", "fastapi development", "fastapi rest api"]
    },
    {
      "id": "BE-006", "canonical_name": "Spring Boot", "domain": "web_backend",
      "aliases": ["spring boot", "springboot", "spring-boot", "spring framework", "spring", "java spring", "spring mvc", "spring boot development", "spring boot (java)", "pivotal spring", "spring rest", "spring data", "spring security", "spring boot microservices"]
    },
    {
      "id": "BE-007", "canonical_name": "Ruby on Rails", "domain": "web_backend",
      "aliases": ["ruby on rails", "rails", "ror", "ruby rails", "rails framework", "ruby on rails development", "rails development", "rails (ruby)", "rails 6", "rails 7", "rails mvc"]
    },
    {
      "id": "BE-008", "canonical_name": "Laravel", "domain": "web_backend",
      "aliases": ["laravel", "laravel framework", "php laravel", "laravel development", "laravel (php)", "laravel backend", "laravel api", "laravel 9", "laravel 10"]
    },
    {
      "id": "BE-009", "canonical_name": "ASP.NET", "domain": "web_backend",
      "aliases": ["asp.net", "asp.net core", "aspnet", "asp.net mvc", "asp net", "dotnet", ".net", ".net core", ".net framework", "microsoft .net", "asp.net development", ".net 5", ".net 6", ".net 7", ".net 8", "dotnet core", "blazor", "asp.net web api", ".net web api", "c# asp.net"]
    },
    {
      "id": "BE-010", "canonical_name": "REST API", "domain": "web_backend",
      "aliases": ["rest api", "restful api", "rest", "restful", "rest services", "rest web services", "http api", "rest architecture", "rest-based api", "restful services", "rest api development", "api rest", "restful web api", "json api", "rest endpoints", "openapi", "swagger api"]
    },
    {
      "id": "BE-011", "canonical_name": "gRPC", "domain": "web_backend",
      "aliases": ["grpc", "g rpc", "grpc framework", "protocol buffers grpc", "grpc api", "grpc services", "protobuf", "protocol buffers"]
    },
    {
      "id": "BE-012", "canonical_name": "Microservices", "domain": "web_backend",
      "aliases": ["microservices", "micro services", "microservice architecture", "microservice design", "microservices architecture", "microservice development", "distributed services", "service-oriented architecture", "soa", "service mesh", "micro-services"]
    },
    {
      "id": "BE-013", "canonical_name": "Apache Kafka", "domain": "web_backend",
      "aliases": ["kafka", "apache kafka", "kafka streaming", "kafka messaging", "kafka broker", "kafka queues", "kafka topics", "kafka producer", "kafka consumer", "event streaming kafka", "kafka (apache)", "confluent kafka", "kafka streams"]
    },
    {
      "id": "BE-014", "canonical_name": "RabbitMQ", "domain": "web_backend",
      "aliases": ["rabbitmq", "rabbit mq", "amqp", "rabbitmq messaging", "rabbitmq broker", "message queue rabbitmq", "rabbitmq (amqp)"]
    },
    {
      "id": "BE-015", "canonical_name": "Nginx", "domain": "web_backend",
      "aliases": ["nginx", "nginx server", "nginx web server", "nginx reverse proxy", "nginx load balancer", "nginx configuration", "nginx (web server)"]
    },
    {
      "id": "BE-016", "canonical_name": "Apache HTTP Server", "domain": "web_backend",
      "aliases": ["apache", "apache http server", "apache httpd", "apache web server", "apache2", "httpd", "apache server configuration"]
    },
    {
      "id": "BE-017", "canonical_name": "NestJS", "domain": "web_backend",
      "aliases": ["nestjs", "nest.js", "nest js", "nestjs framework", "nestjs (node.js)", "nestjs development", "nestjs typescript"]
    },

    {
      "id": "DB-001", "canonical_name": "MySQL", "domain": "databases",
      "aliases": ["mysql", "my sql", "mysql database", "mysql server", "mysql development", "mysql rdbms", "mysql 5.7", "mysql 8", "mysql 8.0", "mysql (rdbms)", "oracle mysql", "mariadb mysql", "mysql queries", "mysql administration"]
    },
    {
      "id": "DB-002", "canonical_name": "PostgreSQL", "domain": "databases",
      "aliases": ["postgresql", "postgres", "postgre sql", "psql", "postgresql database", "postgresql (postgres)", "postgres db", "postgresql development", "postgresql 13", "postgresql 14", "postgresql 15", "postgresql 16", "pg", "pgsql", "postgres rdbms"]
    },
    {
      "id": "DB-003", "canonical_name": "MongoDB", "domain": "databases",
      "aliases": ["mongodb", "mongo db", "mongo", "mongodb database", "mongodb development", "nosql mongodb", "mongodb (nosql)", "mongodb atlas", "mongoDB", "mongodb aggregation", "mongoose", "mongodb queries"]
    },
    {
      "id": "DB-004", "canonical_name": "Redis", "domain": "databases",
      "aliases": ["redis", "redis cache", "redis database", "redis in-memory", "redis server", "redis data store", "redis pub/sub", "redis (caching)", "redis cluster", "redis sentinel", "key-value store redis", "redis stack"]
    },
    {
      "id": "DB-005", "canonical_name": "SQLite", "domain": "databases",
      "aliases": ["sqlite", "sqlite3", "sqlite database", "sql lite", "sqlite (embedded)", "sqlite development"]
    },
    {
      "id": "DB-006", "canonical_name": "Oracle Database", "domain": "databases",
      "aliases": ["oracle", "oracle db", "oracle database", "oracle sql", "pl/sql", "oracle rdbms", "oracle 19c", "oracle 21c", "oracle dba", "oracle development", "oracle database administration", "oracle (pl/sql)", "oracle forms"]
    },
    {
      "id": "DB-007", "canonical_name": "Microsoft SQL Server", "domain": "databases",
      "aliases": ["sql server", "microsoft sql server", "mssql", "ms sql", "ms sql server", "sql server 2019", "sql server 2022", "t-sql", "tsql", "transact-sql", "mssql server", "sql server (mssql)", "azure sql"]
    },
    {
      "id": "DB-008", "canonical_name": "Cassandra", "domain": "databases",
      "aliases": ["cassandra", "apache cassandra", "cassandra db", "cassandra database", "nosql cassandra", "cassandra (nosql)", "datastax cassandra", "cql"]
    },
    {
      "id": "DB-009", "canonical_name": "Elasticsearch", "domain": "databases",
      "aliases": ["elasticsearch", "elastic search", "elastic", "elk stack", "elk", "elasticsearch (elk)", "opensearch", "elasticsearch development", "elasticsearch cluster", "elasticsearch indexing", "kibana elasticsearch"]
    },
    {
      "id": "DB-010", "canonical_name": "Firebase", "domain": "databases",
      "aliases": ["firebase", "google firebase", "firebase database", "firestore", "cloud firestore", "firebase realtime database", "firebase (google)", "firebase development", "firebase auth", "firebase hosting"]
    },
    {
      "id": "DB-011", "canonical_name": "DynamoDB", "domain": "databases",
      "aliases": ["dynamodb", "aws dynamodb", "amazon dynamodb", "dynamo db", "dynamodb (aws)", "dynamodb database", "nosql dynamodb"]
    },
    {
      "id": "DB-012", "canonical_name": "Neo4j", "domain": "databases",
      "aliases": ["neo4j", "neo4j database", "graph database", "neo4j graph db", "cypher query language", "cypher", "neo4j (graph db)"]
    },
    {
      "id": "DB-013", "canonical_name": "MariaDB", "domain": "databases",
      "aliases": ["mariadb", "maria db", "mariadb database", "mariadb (mysql compatible)", "mariadb development"]
    },
    {
      "id": "DB-014", "canonical_name": "Snowflake", "domain": "databases",
      "aliases": ["snowflake", "snowflake db", "snowflake data warehouse", "snowflake cloud", "snowflake (cloud data warehouse)", "snowflake sql"]
    },
    {
      "id": "DB-015", "canonical_name": "InfluxDB", "domain": "databases",
      "aliases": ["influxdb", "influx db", "influx database", "time series database influxdb", "influxdb (time series)"]
    },

    {
      "id": "DO-001", "canonical_name": "Docker", "domain": "devops_cloud",
      "aliases": ["docker", "docker container", "containerization", "docker development", "docker engine", "docker compose", "docker-compose", "docker hub", "docker file", "dockerfile", "docker swarm", "docker desktop", "container docker", "docker (containerization)"]
    },
    {
      "id": "DO-002", "canonical_name": "Kubernetes", "domain": "devops_cloud",
      "aliases": ["kubernetes", "k8s", "k 8 s", "kube", "kubernetes orchestration", "kubernetes cluster", "kubernetes development", "kubernetes (k8s)", "google kubernetes", "kubernetes deployment", "kubernetes administration", "helm", "helm charts", "kubectl", "openshift kubernetes", "eks kubernetes", "gke kubernetes", "aks kubernetes", "kubernetes (k8s) orchestration"]
    },
    {
      "id": "DO-003", "canonical_name": "AWS", "domain": "devops_cloud",
      "aliases": ["aws", "amazon web services", "amazon aws", "aws cloud", "aws development", "aws services", "amazon cloud", "aws platform", "aws infrastructure", "aws (amazon web services)", "cloud aws"]
    },
    {
      "id": "DO-004", "canonical_name": "Azure", "domain": "devops_cloud",
      "aliases": ["azure", "microsoft azure", "azure cloud", "azure development", "azure services", "microsoft cloud", "azure platform", "azure infrastructure", "azure (microsoft)", "cloud azure"]
    },
    {
      "id": "DO-005", "canonical_name": "Google Cloud Platform", "domain": "devops_cloud",
      "aliases": ["gcp", "google cloud", "google cloud platform", "google cloud services", "gcp services", "google cloud development", "google cloud (gcp)", "cloud gcp", "google cloud infrastructure"]
    },
    {
      "id": "DO-006", "canonical_name": "CI/CD", "domain": "devops_cloud",
      "aliases": ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment", "ci/cd pipeline", "ci/cd workflows", "continuous integration/continuous delivery", "cicd", "ci-cd", "devops ci/cd", "build pipeline"]
    },
    {
      "id": "DO-007", "canonical_name": "Jenkins", "domain": "devops_cloud",
      "aliases": ["jenkins", "jenkins ci", "jenkins cd", "jenkins ci/cd", "jenkins pipeline", "jenkins automation", "jenkins development", "jenkins (ci/cd)"]
    },
    {
      "id": "DO-008", "canonical_name": "GitHub Actions", "domain": "devops_cloud",
      "aliases": ["github actions", "github action", "gh actions", "github workflows", "github ci/cd", "github actions (ci/cd)", "actions workflows"]
    },
    {
      "id": "DO-009", "canonical_name": "Terraform", "domain": "devops_cloud",
      "aliases": ["terraform", "hashicorp terraform", "terraform iac", "terraform infrastructure", "terraform (iac)", "infrastructure as code terraform", "terraform development", "tf", "terraform cloud", "terraform modules"]
    },
    {
      "id": "DO-010", "canonical_name": "Ansible", "domain": "devops_cloud",
      "aliases": ["ansible", "ansible automation", "ansible playbooks", "ansible development", "red hat ansible", "ansible (automation)", "ansible tower", "ansible awx"]
    },
    {
      "id": "DO-011", "canonical_name": "Git", "domain": "devops_cloud",
      "aliases": ["git", "git version control", "git scm", "git source control", "version control git", "source control management", "scm", "git branching", "git workflows", "git flow", "gitflow"]
    },
    {
      "id": "DO-012", "canonical_name": "Linux", "domain": "devops_cloud",
      "aliases": ["linux", "linux os", "linux system", "ubuntu", "debian", "centos", "rhel", "red hat", "fedora", "linux administration", "linux server", "unix", "unix/linux", "linux/unix", "linux shell", "linux kernel", "ubuntu linux", "centos linux", "rhel linux", "linux command line"]
    },
    {
      "id": "DO-013", "canonical_name": "Helm", "domain": "devops_cloud",
      "aliases": ["helm", "helm charts", "kubernetes helm", "helm (kubernetes)", "helm package manager", "helm deployments"]
    },
    {
      "id": "DO-014", "canonical_name": "Prometheus", "domain": "devops_cloud",
      "aliases": ["prometheus", "prometheus monitoring", "prometheus metrics", "prometheus alerting", "prometheus (monitoring)", "prometheus/grafana"]
    },
    {
      "id": "DO-015", "canonical_name": "Grafana", "domain": "devops_cloud",
      "aliases": ["grafana", "grafana dashboards", "grafana monitoring", "grafana visualization", "grafana (monitoring)", "prometheus grafana"]
    },
    {
      "id": "DO-016", "canonical_name": "GitLab CI", "domain": "devops_cloud",
      "aliases": ["gitlab ci", "gitlab ci/cd", "gitlab pipelines", "gitlab (ci/cd)", "gitlab actions", "gitlab runners"]
    },
    {
      "id": "DO-017", "canonical_name": "CircleCI", "domain": "devops_cloud",
      "aliases": ["circleci", "circle ci", "circleci pipelines", "circleci (ci/cd)"]
    },
    {
      "id": "DO-018", "canonical_name": "Infrastructure as Code", "domain": "devops_cloud",
      "aliases": ["infrastructure as code", "iac", "infrastructure-as-code", "iac tools", "infrastructure automation", "configuration management", "config as code"]
    },
    {
      "id": "DO-019", "canonical_name": "AWS Lambda", "domain": "devops_cloud",
      "aliases": ["lambda", "aws lambda", "serverless lambda", "lambda functions", "function as a service", "faas", "lambda (serverless)", "aws serverless"]
    },
    {
      "id": "DO-020", "canonical_name": "Serverless", "domain": "devops_cloud",
      "aliases": ["serverless", "serverless architecture", "serverless framework", "serverless computing", "faas", "function as a service", "event-driven serverless", "serverless development"]
    },

    {
      "id": "DS-001", "canonical_name": "Machine Learning", "domain": "data_science_ml",
      "aliases": ["machine learning", "ml", "ml development", "ml engineering", "ml algorithms", "machine learning algorithms", "supervised learning", "unsupervised learning", "reinforcement learning", "ml model development", "machine learning (ml)", "statistical machine learning", "ml modeling", "machine learning models", "applied machine learning"]
    },
    {
      "id": "DS-002", "canonical_name": "Deep Learning", "domain": "data_science_ml",
      "aliases": ["deep learning", "dl", "neural networks", "deep neural networks", "dnn", "deep learning algorithms", "deep neural network", "ann", "artificial neural networks", "neural network development", "dl models", "deep learning (dl)", "convolutional neural networks", "cnn", "recurrent neural networks", "rnn"]
    },
    {
      "id": "DS-003", "canonical_name": "TensorFlow", "domain": "data_science_ml",
      "aliases": ["tensorflow", "tensor flow", "tensorflow 2", "tensorflow 2.x", "tf", "google tensorflow", "tensorflow development", "tensorflow (dl framework)", "tensorflow/keras", "tf 2", "tensorflow lite"]
    },
    {
      "id": "DS-004", "canonical_name": "PyTorch", "domain": "data_science_ml",
      "aliases": ["pytorch", "py torch", "pytorch framework", "pytorch development", "torch", "facebook pytorch", "meta pytorch", "pytorch (dl framework)", "pytorch lightning", "torchvision"]
    },
    {
      "id": "DS-005", "canonical_name": "Scikit-learn", "domain": "data_science_ml",
      "aliases": ["scikit-learn", "sklearn", "scikit learn", "scikit-learn library", "sklearn library", "python scikit-learn", "scikit-learn (sklearn)", "sklearn models"]
    },
    {
      "id": "DS-006", "canonical_name": "Pandas", "domain": "data_science_ml",
      "aliases": ["pandas", "pandas library", "python pandas", "pandas dataframes", "pandas data analysis", "pandas (python)", "pd", "pandas development"]
    },
    {
      "id": "DS-007", "canonical_name": "NumPy", "domain": "data_science_ml",
      "aliases": ["numpy", "num py", "numpy library", "python numpy", "numpy arrays", "numpy (python)", "np", "numpy development", "numerical python"]
    },
    {
      "id": "DS-008", "canonical_name": "Data Science", "domain": "data_science_ml",
      "aliases": ["data science", "data sciences", "data scientist", "data science development", "data analysis", "data analytics", "exploratory data analysis", "eda", "statistical analysis", "data exploration", "data insights", "data science & analytics"]
    },
    {
      "id": "DS-009", "canonical_name": "Natural Language Processing", "domain": "data_science_ml",
      "aliases": ["nlp", "natural language processing", "text mining", "text analytics", "computational linguistics", "nlp development", "nlp algorithms", "natural language understanding", "nlu", "natural language generation", "nlg", "nlp (natural language processing)", "text classification", "sentiment analysis", "named entity recognition", "ner"]
    },
    {
      "id": "DS-010", "canonical_name": "Computer Vision", "domain": "data_science_ml",
      "aliases": ["computer vision", "cv", "image processing", "image recognition", "object detection", "image classification", "opencv", "open cv", "computer vision development", "cv (computer vision)", "visual recognition", "image segmentation", "video analysis"]
    },
    {
      "id": "DS-011", "canonical_name": "Large Language Models", "domain": "data_science_ml",
      "aliases": ["llm", "llms", "large language models", "language models", "gpt", "openai gpt", "gpt-4", "gpt-3", "gpt3", "gpt4", "chatgpt", "llm development", "llm fine-tuning", "prompt engineering", "generative ai", "gen ai", "foundation models", "transformer models", "rag", "retrieval augmented generation", "llm engineering"]
    },
    {
      "id": "DS-012", "canonical_name": "Apache Spark", "domain": "data_science_ml",
      "aliases": ["apache spark", "spark", "pyspark", "py spark", "spark framework", "spark development", "spark sql", "spark streaming", "spark (big data)", "big data spark"]
    },
    {
      "id": "DS-013", "canonical_name": "Hadoop", "domain": "data_science_ml",
      "aliases": ["hadoop", "apache hadoop", "hadoop ecosystem", "hadoop development", "hdfs", "hadoop distributed file system", "hadoop (bigdata)", "mapreduce", "hive", "pig", "hbase"]
    },
    {
      "id": "DS-014", "canonical_name": "Tableau", "domain": "data_science_ml",
      "aliases": ["tableau", "tableau desktop", "tableau software", "tableau development", "tableau server", "tableau online", "tableau public", "data visualization tableau", "tableau (visualization)"]
    },
    {
      "id": "DS-015", "canonical_name": "Power BI", "domain": "data_science_ml",
      "aliases": ["power bi", "powerbi", "power business intelligence", "microsoft power bi", "power bi development", "power bi desktop", "power bi service", "power bi (microsoft)", "power bi dashboards", "power bi reports", "dax", "power query"]
    },
    {
      "id": "DS-016", "canonical_name": "Apache Airflow", "domain": "data_science_ml",
      "aliases": ["airflow", "apache airflow", "airflow dags", "airflow orchestration", "airflow development", "airflow (workflow)", "data pipeline airflow"]
    },
    {
      "id": "DS-017", "canonical_name": "dbt", "domain": "data_science_ml",
      "aliases": ["dbt", "data build tool", "dbt core", "dbt cloud", "dbt (data build tool)", "dbt development", "dbt modeling", "dbt transformations"]
    },
    {
      "id": "DS-018", "canonical_name": "MLflow", "domain": "data_science_ml",
      "aliases": ["mlflow", "ml flow", "mlflow tracking", "mlflow development", "ml experiment tracking", "mlops mlflow"]
    },
    {
      "id": "DS-019", "canonical_name": "Hugging Face", "domain": "data_science_ml",
      "aliases": ["hugging face", "huggingface", "transformers library", "hugging face transformers", "huggingface hub", "hf transformers", "hugging face (nlp)"]
    },
    {
      "id": "DS-020", "canonical_name": "MLOps", "domain": "data_science_ml",
      "aliases": ["mlops", "ml ops", "machine learning operations", "ml engineering ops", "model deployment", "model serving", "ml pipeline", "ml lifecycle", "model monitoring", "machine learning operations (mlops)"]
    },

    {
      "id": "MOB-001", "canonical_name": "Android Development", "domain": "mobile",
      "aliases": ["android", "android development", "android app development", "android programming", "android sdk", "android studio", "android (java/kotlin)", "android (kotlin)", "android (java)", "java android", "kotlin android", "native android", "android applications", "android mobile development"]
    },
    {
      "id": "MOB-002", "canonical_name": "iOS Development", "domain": "mobile",
      "aliases": ["ios", "ios development", "ios app development", "ios programming", "apple ios", "xcode", "ios sdk", "ios (swift)", "swift ios", "objective-c", "objective c", "objc", "ios (objective-c)", "native ios", "ios applications", "iphone app development", "ipad app development"]
    },
    {
      "id": "MOB-003", "canonical_name": "React Native", "domain": "mobile",
      "aliases": ["react native", "reactnative", "react-native", "react native development", "cross-platform react native", "rn", "react native (mobile)", "react native android", "react native ios"]
    },
    {
      "id": "MOB-004", "canonical_name": "Flutter", "domain": "mobile",
      "aliases": ["flutter", "flutter development", "flutter framework", "dart flutter", "google flutter", "flutter (dart)", "flutter mobile", "flutter app development", "cross-platform flutter", "flutter ios", "flutter android"]
    },
    {
      "id": "MOB-005", "canonical_name": "Xamarin", "domain": "mobile",
      "aliases": ["xamarin", "xamarin forms", "xamarin development", "microsoft xamarin", "xamarin (c#)", "xamarin mobile", ".net maui", "maui"]
    },
    {
      "id": "MOB-006", "canonical_name": "Ionic", "domain": "mobile",
      "aliases": ["ionic", "ionic framework", "ionic development", "ionic (angular)", "ionic react", "ionic vue", "capacitor", "ionic capacitor"]
    },

    {
      "id": "QA-001", "canonical_name": "Selenium", "domain": "testing_qa",
      "aliases": ["selenium", "selenium webdriver", "selenium testing", "selenium automation", "selenium (testing)", "selenium grid", "selenium java", "selenium python", "web automation selenium"]
    },
    {
      "id": "QA-002", "canonical_name": "Cypress", "domain": "testing_qa",
      "aliases": ["cypress", "cypress.io", "cypress testing", "cypress e2e", "e2e testing cypress", "cypress (testing)", "cypress automation"]
    },
    {
      "id": "QA-003", "canonical_name": "Jest", "domain": "testing_qa",
      "aliases": ["jest", "jest testing", "jest framework", "jest (javascript)", "jestjs", "jest unit testing", "jest js testing"]
    },
    {
      "id": "QA-004", "canonical_name": "JUnit", "domain": "testing_qa",
      "aliases": ["junit", "junit 4", "junit 5", "junit testing", "java junit", "junit framework", "junit (java)"]
    },
    {
      "id": "QA-005", "canonical_name": "Postman", "domain": "testing_qa",
      "aliases": ["postman", "postman api testing", "postman (api)", "api testing postman", "postman collection", "postman development"]
    },
    {
      "id": "QA-006", "canonical_name": "Test Automation", "domain": "testing_qa",
      "aliases": ["test automation", "automation testing", "automated testing", "test automation framework", "qa automation", "quality assurance automation", "automated test development", "test scripting", "automation qa"]
    },
    {
      "id": "QA-007", "canonical_name": "Playwright", "domain": "testing_qa",
      "aliases": ["playwright", "playwright testing", "playwright automation", "microsoft playwright", "playwright e2e"]
    },
    {
      "id": "QA-008", "canonical_name": "PyTest", "domain": "testing_qa",
      "aliases": ["pytest", "py test", "pytest framework", "python pytest", "pytest (python)", "pytest testing"]
    },
    {
      "id": "QA-009", "canonical_name": "SonarQube", "domain": "testing_qa",
      "aliases": ["sonarqube", "sonar qube", "sonar", "code quality sonarqube", "sonarqube analysis", "sonarqube (code quality)"]
    },
    {
      "id": "QA-010", "canonical_name": "Load Testing", "domain": "testing_qa",
      "aliases": ["load testing", "performance testing", "stress testing", "jmeter", "apache jmeter", "k6", "gatling", "locust", "load & performance testing", "performance test automation"]
    },

    {
      "id": "SEC-001", "canonical_name": "Cybersecurity", "domain": "security",
      "aliases": ["cybersecurity", "cyber security", "information security", "infosec", "it security", "network security", "application security", "appsec", "security engineering", "cybersecurity development"]
    },
    {
      "id": "SEC-002", "canonical_name": "Penetration Testing", "domain": "security",
      "aliases": ["penetration testing", "pen testing", "pentest", "ethical hacking", "security testing", "vulnerability assessment", "red teaming", "pentesting", "pen test", "offensive security"]
    },
    {
      "id": "SEC-003", "canonical_name": "OAuth", "domain": "security",
      "aliases": ["oauth", "oauth 2.0", "oauth2", "oauth authentication", "oauth authorization", "openid connect", "oidc", "jwt", "json web token", "oauth/jwt", "token-based authentication", "bearer token"]
    },
    {
      "id": "SEC-004", "canonical_name": "SIEM", "domain": "security",
      "aliases": ["siem", "security information and event management", "splunk", "ibm qradar", "microsoft sentinel", "azure sentinel", "elastic siem", "siem tools"]
    },
    {
      "id": "SEC-005", "canonical_name": "Vulnerability Management", "domain": "security",
      "aliases": ["vulnerability management", "vulnerability assessment", "security scanning", "nessus", "qualys", "openvas", "vulnerability scanning", "cve management", "patch management"]
    },

    {
      "id": "NET-001", "canonical_name": "Networking", "domain": "networking",
      "aliases": ["networking", "computer networks", "network engineering", "network administration", "network configuration", "tcp/ip", "tcp ip", "network protocols", "lan", "wan", "networking protocols", "network infrastructure"]
    },
    {
      "id": "NET-002", "canonical_name": "Cisco", "domain": "networking",
      "aliases": ["cisco", "cisco networking", "cisco routers", "cisco switches", "cisco ios", "ccna", "ccnp", "ccie", "cisco (ccna/ccnp)", "cisco administration"]
    },
    {
      "id": "NET-003", "canonical_name": "DNS", "domain": "networking",
      "aliases": ["dns", "domain name system", "dns management", "dns configuration", "dns administration", "route 53", "cloudflare dns"]
    },

    {
      "id": "PM-001", "canonical_name": "Agile", "domain": "project_management",
      "aliases": ["agile", "agile methodology", "agile development", "agile framework", "agile project management", "agile practices", "agile principles", "agile scrum", "scrum/kanban", "agile/scrum", "agile processes"]
    },
    {
      "id": "PM-002", "canonical_name": "Scrum", "domain": "project_management",
      "aliases": ["scrum", "scrum methodology", "scrum framework", "scrum master", "scrum development", "scrum ceremonies", "scrum process", "daily scrum", "sprint planning", "retrospective", "scrum agile"]
    },
    {
      "id": "PM-003", "canonical_name": "Jira", "domain": "project_management",
      "aliases": ["jira", "jira software", "atlassian jira", "jira development", "jira project management", "jira administration", "jira (atlassian)", "jira tickets", "jira workflows", "jira boards"]
    },
    {
      "id": "PM-004", "canonical_name": "Kanban", "domain": "project_management",
      "aliases": ["kanban", "kanban methodology", "kanban board", "kanban workflow", "kanban system", "lean kanban", "kanban process"]
    },
    {
      "id": "PM-005", "canonical_name": "Project Management", "domain": "project_management",
      "aliases": ["project management", "pm", "program management", "project planning", "project coordination", "project delivery", "project execution", "pmp", "prince2", "project management professional", "project manager", "project lead", "it project management"]
    },
    {
      "id": "PM-006", "canonical_name": "Confluence", "domain": "project_management",
      "aliases": ["confluence", "atlassian confluence", "confluence wiki", "confluence pages", "confluence documentation", "confluence (atlassian)"]
    },
    {
      "id": "PM-007", "canonical_name": "SAFe", "domain": "project_management",
      "aliases": ["safe", "scaled agile framework", "safe agile", "safe methodology", "scaled agile", "safe 5", "safe 6", "safe (scaled agile)"]
    },

    {
      "id": "DES-001", "canonical_name": "Figma", "domain": "design_ux",
      "aliases": ["figma", "figma design", "figma ui", "figma ux", "figma prototyping", "figma development", "figma (design)", "figma collaboration", "figma wireframing"]
    },
    {
      "id": "DES-002", "canonical_name": "UI/UX Design", "domain": "design_ux",
      "aliases": ["ui/ux", "ui ux", "ui design", "ux design", "user interface design", "user experience design", "ux research", "usability", "interaction design", "visual design", "product design", "ui/ux design", "hci", "human computer interaction", "user-centered design"]
    },
    {
      "id": "DES-003", "canonical_name": "Adobe XD", "domain": "design_ux",
      "aliases": ["adobe xd", "xd", "adobe experience design", "adobe xd design", "adobe xd prototyping"]
    },
    {
      "id": "DES-004", "canonical_name": "Sketch", "domain": "design_ux",
      "aliases": ["sketch", "sketch app", "sketch design", "sketch ui design", "sketch (design tool)", "bohemian sketch"]
    },
    {
      "id": "DES-005", "canonical_name": "Adobe Photoshop", "domain": "design_ux",
      "aliases": ["photoshop", "adobe photoshop", "ps", "photoshop design", "photoshop editing", "image editing photoshop"]
    },
    {
      "id": "DES-006", "canonical_name": "Adobe Illustrator", "domain": "design_ux",
      "aliases": ["illustrator", "adobe illustrator", "ai", "vector design", "illustrator design", "adobe illustrator (vector)"]
    },

    {
      "id": "SOFT-001", "canonical_name": "Communication", "domain": "soft_skills",
      "aliases": ["communication", "strong communication", "excellent communication", "verbal communication", "written communication", "interpersonal communication", "communication skills", "effective communication", "professional communication", "presentation skills", "public speaking"]
    },
    {
      "id": "SOFT-002", "canonical_name": "Leadership", "domain": "soft_skills",
      "aliases": ["leadership", "team leadership", "strong leadership", "leadership skills", "people leadership", "technical leadership", "lead", "leading teams", "leadership development", "management", "people management"]
    },
    {
      "id": "SOFT-003", "canonical_name": "Problem Solving", "domain": "soft_skills",
      "aliases": ["problem solving", "problem-solving", "analytical thinking", "critical thinking", "analytical skills", "problem resolution", "troubleshooting", "debugging", "solution design", "problem analysis"]
    },
    {
      "id": "SOFT-004", "canonical_name": "Collaboration", "domain": "soft_skills",
      "aliases": ["collaboration", "team collaboration", "cross-functional collaboration", "teamwork", "team player", "cross-team collaboration", "collaborative", "working in teams", "cooperative"]
    },
    {
      "id": "SOFT-005", "canonical_name": "Mentoring", "domain": "soft_skills",
      "aliases": ["mentoring", "mentorship", "coaching", "mentoring junior developers", "technical mentoring", "team mentoring", "knowledge sharing"]
    },
    {
      "id": "SOFT-006", "canonical_name": "Time Management", "domain": "soft_skills",
      "aliases": ["time management", "deadline management", "prioritization", "workload management", "time management skills", "self-management", "task management"]
    },

    {
      "id": "BI-001", "canonical_name": "Excel", "domain": "bi_analytics",
      "aliases": ["excel", "microsoft excel", "ms excel", "excel spreadsheets", "advanced excel", "excel vba", "vba", "excel formulas", "excel modeling", "excel (microsoft)", "pivot tables", "vlookup", "excel data analysis"]
    },
    {
      "id": "BI-002", "canonical_name": "Looker", "domain": "bi_analytics",
      "aliases": ["looker", "google looker", "looker studio", "google data studio", "lookml", "looker (bi)", "data studio", "looker development"]
    },
    {
      "id": "BI-003", "canonical_name": "Apache Hive", "domain": "bi_analytics",
      "aliases": ["hive", "apache hive", "hiveql", "hive sql", "hive (hadoop)", "hive development", "hive queries"]
    },

    {
      "id": "ERP-001", "canonical_name": "SAP", "domain": "erp_crm",
      "aliases": ["sap", "sap erp", "sap s/4hana", "sap hana", "sap development", "sap abap", "abap", "sap administration", "sap (erp)", "sap btp", "sap fiori", "sap basis", "sap implementation"]
    },
    {
      "id": "ERP-002", "canonical_name": "Salesforce", "domain": "erp_crm",
      "aliases": ["salesforce", "sfdc", "salesforce crm", "salesforce development", "salesforce admin", "salesforce administration", "apex", "salesforce apex", "visualforce", "lightning", "salesforce lightning", "crm salesforce", "salesforce (crm)", "force.com", "salesforce platform"]
    },
    {
      "id": "ERP-003", "canonical_name": "ServiceNow", "domain": "erp_crm",
      "aliases": ["servicenow", "service now", "servicenow development", "servicenow admin", "servicenow platform", "snow", "servicenow itsm", "servicenow (itsm)"]
    },
    {
      "id": "ERP-004", "canonical_name": "HubSpot", "domain": "erp_crm",
      "aliases": ["hubspot", "hub spot", "hubspot crm", "hubspot development", "hubspot marketing", "crm hubspot"]
    },

    {
      "id": "IOT-001", "canonical_name": "IoT", "domain": "embedded_iot",
      "aliases": ["iot", "internet of things", "iot development", "iot devices", "iot engineering", "iot applications", "embedded iot", "connected devices", "iot platform", "iot architecture"]
    },
    {
      "id": "IOT-002", "canonical_name": "Embedded Systems", "domain": "embedded_iot",
      "aliases": ["embedded systems", "embedded development", "embedded programming", "firmware development", "embedded c", "embedded c++", "rtos", "real-time operating system", "bare-metal programming", "microcontroller programming", "embedded engineering"]
    },
    {
      "id": "IOT-003", "canonical_name": "Arduino", "domain": "embedded_iot",
      "aliases": ["arduino", "arduino development", "arduino programming", "arduino ide", "arduino (microcontroller)"]
    },
    {
      "id": "IOT-004", "canonical_name": "Raspberry Pi", "domain": "embedded_iot",
      "aliases": ["raspberry pi", "raspberry pi development", "raspberry pi programming", "rpi", "raspberry pi (iot)", "raspberry pi (embedded)"]
    },

    {
      "id": "BC-001", "canonical_name": "Blockchain", "domain": "blockchain",
      "aliases": ["blockchain", "blockchain development", "blockchain technology", "distributed ledger", "dlt", "blockchain engineering", "smart contracts", "ethereum", "web3", "defi", "decentralized applications", "dapps", "blockchain (web3)"]
    },

    {
      "id": "GAME-001", "canonical_name": "Unity", "domain": "game_dev",
      "aliases": ["unity", "unity 3d", "unity3d", "unity engine", "unity game development", "unity development", "unity (c#)", "unity game engine"]
    },
    {
      "id": "GAME-002", "canonical_name": "Unreal Engine", "domain": "game_dev",
      "aliases": ["unreal engine", "unreal", "ue4", "ue5", "unreal engine 4", "unreal engine 5", "unreal development", "epic games unreal", "unreal engine (c++)"]
    },

    {
      "id": "OFF-001", "canonical_name": "Microsoft Office", "domain": "office_productivity",
      "aliases": ["microsoft office", "ms office", "office suite", "microsoft 365", "office 365", "ms office suite", "microsoft office 365", "microsoft tools"]
    },
    {
      "id": "OFF-002", "canonical_name": "Google Workspace", "domain": "office_productivity",
      "aliases": ["google workspace", "g suite", "gsuite", "google apps", "google docs", "google sheets", "google slides", "google drive", "google (workspace)", "google collaboration tools"]
    }
  ]
}

# Pre-build lookup map for lightning-fast matching
_skill_lookup = {}
_category_lookup = {}

for skill in SKILLS_DATA["skills"]:
    canon = skill["canonical_name"]
    cat = skill["domain"]
    for alias in skill["aliases"]:
        key = alias.lower().strip()
        _skill_lookup[key] = canon
        _category_lookup[canon] = cat

class SkillNormalizationAgent:
    """Super-fast normalization using the built-in JSON lookup map."""
    def __init__(self):
        pass

    async def normalize(self, raw_skills: list, db=None) -> list:
        return self._normalize_list(raw_skills)
        
    def _normalize_list(self, raw_skills: list) -> list:
        results = []
        for skill_obj in raw_skills:
            if isinstance(skill_obj, str):
                raw = skill_obj
                skill_obj = {"skill": raw}
            else:
                raw = skill_obj.get("skill", "")
                
            if not raw: 
                continue
            
            key = raw.lower().strip()
            match = _skill_lookup.get(key)
            
            years = skill_obj.get("years")
            level = skill_obj.get("level")
            if level:
                prof = level
            elif years is None:
                prof = "intermediate"
            elif float(years) < 1:
                prof = "beginner"
            elif float(years) < 3:
                prof = "intermediate"
            else:
                prof = "expert"

            if match:
                results.append({
                    "raw_skill": raw,
                    "canonical_skill": match,
                    "category": _category_lookup.get(match, "Unknown"),
                    "parent_category": _category_lookup.get(match, "Unknown"),
                    "proficiency": prof,
                    "years": years,
                    "confidence": 1.0,
                    "is_inferred": False,
                    "is_unknown": False
                })
            else:
                results.append({
                    "raw_skill": raw,
                    "canonical_skill": raw,
                    "category": "Unknown",
                    "parent_category": "Unknown",
                    "proficiency": prof,
                    "years": years,
                    "confidence": 0.3,
                    "is_inferred": False,
                    "is_unknown": True
                })
        return results

# A simple sync version perfectly matching the celery worker expectations:
def _normalize_skills_sync(raw_skills: list, db=None) -> list:
    """Synchronous version for celery workers."""
    agent = SkillNormalizationAgent()
    return agent._normalize_list(raw_skills)
