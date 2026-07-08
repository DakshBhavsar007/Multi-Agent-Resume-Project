import os
import sys

def upload_models():
    try:
        from huggingface_hub import HfApi, login
    except ImportError:
        print("huggingface_hub is not installed. Please run: pip install huggingface_hub")
        sys.exit(1)
        
    print("==================================================")
    print("     HUGGING FACE MODEL UPLOAD UTILITY            ")
    print("==================================================")
    
    # Resolve local directory paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
    models_dir = os.path.join(backend_dir, "models")
    
    if not os.path.exists(models_dir):
        print(f"Error: Models directory not found at {models_dir}")
        sys.exit(1)
        
    # Get Hugging Face write token
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        print("HF_TOKEN environment variable not set.")
        hf_token = input("Please enter your Hugging Face Write Token: ").strip()
        if not hf_token:
            print("Token is required to upload files to Hugging Face.")
            sys.exit(1)
            
    # Log in
    try:
        login(token=hf_token, write_permission=True)
        print("Successfully logged into Hugging Face.")
    except Exception as e:
        print(f"Login failed: {e}")
        sys.exit(1)
        
    # Get Repository ID
    repo_id = os.environ.get("HF_MODEL_REPO")
    if not repo_id:
        print("HF_MODEL_REPO environment variable not set.")
        repo_id = input("Please enter your target HF repository ID (e.g. username/repo-name): ").strip()
        if not repo_id:
            print("Repository ID is required.")
            sys.exit(1)
            
    api = HfApi()
    
    # Check/Create repository
    try:
        api.create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
        print(f"Repository verified: {repo_id}")
    except Exception as e:
        print(f"Error creating/verifying repository: {e}")
        sys.exit(1)
        
    # Define files/folders to upload
    files_to_upload = {
        "salary_model.pkl": os.path.join(models_dir, "salary_model.pkl"),
        "matching_model.pkl": os.path.join(models_dir, "matching_model.pkl"),
        "fraud_model.pkl": os.path.join(models_dir, "fraud_model.pkl"),
    }
    
    print("\n--- Uploading individual model files ---")
    for filename, filepath in files_to_upload.items():
        if os.path.exists(filepath):
            print(f"Uploading {filename} ({os.path.getsize(filepath)/1024/1024:.2f} MB)...")
            try:
                api.upload_file(
                    path_or_fileobj=filepath,
                    path_in_repo=filename,
                    repo_id=repo_id,
                    repo_type="model"
                )
                print(f"Successfully uploaded {filename}")
            except Exception as e:
                print(f"Failed to upload {filename}: {e}")
        else:
            print(f"Skipping {filename} (file does not exist locally)")
            
    # Upload SpaCy NER model folder
    spacy_dir = os.path.join(models_dir, "ner_resume_parser")
    if os.path.exists(spacy_dir):
        print("\n--- Uploading SpaCy NER parser folder ---")
        print(f"Uploading folder ner_resume_parser...")
        try:
            api.upload_folder(
                folder_path=spacy_dir,
                path_in_repo="ner_resume_parser",
                repo_id=repo_id,
                repo_type="model"
            )
            print("Successfully uploaded SpaCy ner_resume_parser folder")
        except Exception as e:
            print(f"Failed to upload SpaCy folder: {e}")
    else:
        print("\nSkipping SpaCy ner_resume_parser folder (does not exist locally)")
        
    print("\n==================================================")
    print("               UPLOAD PROCESS COMPLETE             ")
    print("==================================================")

if __name__ == "__main__":
    upload_models()
