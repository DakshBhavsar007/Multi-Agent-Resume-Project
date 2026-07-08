import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import json
import random
import spacy
from spacy.training.example import Example
from spacy.util import filter_spans

# File Paths dynamically resolved relative to the script directory
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, ".."))
DATASET_PATH = os.path.join(BACKEND_DIR, "datasets", "Entity Recognition in Resumes.json")
MODEL_DIR = os.path.join(BACKEND_DIR, "models", "ner_resume_parser")

def load_data():
    print(f"Loading dataset from: {DATASET_PATH}")
    train_data = []
    punctuation_chars = ".,;:!?()[]\"'- \n\t"
    
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            item = json.loads(line)
            text = item.get("content", "")
            annotations = item.get("annotation", [])
            
            entities = []
            for ann in annotations:
                label_list = ann.get("label", [])
                if not label_list:
                    continue
                label = label_list[0]
                points = ann.get("points", [])
                for p in points:
                    start = p.get("start")
                    end = p.get("end") + 1 # SpaCy end index is exclusive
                    if start < 0 or end > len(text) or start >= end:
                        continue
                        
                    raw_val = text[start:end]
                    stripped = raw_val.strip(punctuation_chars)
                    if not stripped:
                        continue
                    
                    offset_start = raw_val.index(stripped)
                    new_start = start + offset_start
                    new_end = new_start + len(stripped)
                    entities.append((new_start, new_end, label))
            
            # Filter overlapping spans to satisfy SpaCy constraint
            cleaned_entities = []
            spacy_spans = []
            nlp = spacy.blank("en")
            doc = nlp.make_doc(text)
            for start, end, label in entities:
                # Use strict to guarantee perfect alignment with token boundaries
                span = doc.char_span(start, end, label=label, alignment_mode="strict")
                if span is not None:
                    span_text = span.text
                    if span_text.strip(punctuation_chars) == span_text:
                        spacy_spans.append(span)
            
            filtered = filter_spans(spacy_spans)
            for span in filtered:
                cleaned_entities.append((span.start_char, span.end_char, span.label_))
            
            train_data.append((text, {"entities": cleaned_entities}))
            
    print(f"Loaded {len(train_data)} training records.")
    return train_data

def train_ner():
    train_data = load_data()
    
    # Create blank English model
    print("Initializing blank English SpaCy model...")
    nlp = spacy.blank("en")
    
    # Add NER pipeline
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner", last=True)
    else:
        ner = nlp.get_pipe("ner")
        
    # Add labels
    for _, annotations in train_data:
        for start, end, label in annotations.get("entities"):
            ner.add_label(label)
            
    # Disable other pipes during training
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    print(f"Training NER model. Disabling other pipes: {other_pipes}")
    
    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.begin_training()
        
        # Train for 15 epochs
        epochs = 15
        print(f"Starting training for {epochs} epochs...")
        for epoch in range(epochs):
            random.shuffle(train_data)
            losses = {}
            # Batch size is small
            batches = spacy.util.minibatch(train_data, size=8)
            for batch in batches:
                examples = []
                for text, ann in batch:
                    doc = nlp.make_doc(text)
                    example = Example.from_dict(doc, ann)
                    examples.append(example)
                
                nlp.update(examples, sgd=optimizer, drop=0.35, losses=losses)
            print(f"Epoch {epoch+1}/{epochs} - Losses: {losses}")
            
    # Save the trained model
    os.makedirs(os.path.dirname(MODEL_DIR), exist_ok=True)
    nlp.to_disk(MODEL_DIR)
    print(f"Model saved successfully to: {MODEL_DIR}")

if __name__ == "__main__":
    train_ner()
