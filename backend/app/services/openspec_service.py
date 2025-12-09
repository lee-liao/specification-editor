"""OpenSpec file handling service."""
import zipfile
import io
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple
from uuid import uuid4


class OpenSpecService:
    """Service for handling OpenSpec file operations."""
    
    def __init__(self, temp_dir: str = "./temp"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_structure(self, file_content: bytes) -> Dict[str, Any]:
        """Validate OpenSpec zip structure."""
        try:
            with zipfile.ZipFile(io.BytesIO(file_content)) as zip_file:
                entries = zip_file.namelist()
                
                has_openspec_dir = False
                has_changes_dir = False
                has_specs_dir = False
                has_project_md = False
                
                for entry_path in entries:
                    entry_lower = entry_path.lower()
                    if 'openspec/' in entry_lower or entry_lower.startswith('openspec'):
                        has_openspec_dir = True
                    if 'changes/' in entry_lower:
                        has_changes_dir = True
                    if 'specs/' in entry_lower:
                        has_specs_dir = True
                    if 'project.md' in entry_lower:
                        has_project_md = True
                    
                    # Also check for any markdown file to be permissive
                    if entry_lower.endswith('.md'):
                        has_project_md = True  # Treat as having project metadata for validation purposes
                
                # Debug print
                print(f"Validation keys: openspec={has_openspec_dir}, changes={has_changes_dir}, specs={has_specs_dir}, project={has_project_md}")
                
                return {
                    "isValid": has_openspec_dir or has_changes_dir or has_project_md or has_specs_dir,
                    "hasOpenspecDir": has_openspec_dir,
                    "hasChangesDir": has_changes_dir,
                    "hasSpecsDir": has_specs_dir,
                    "hasProjectMd": has_project_md,
                    "errors": []
                }
                
        except Exception as e:
            return {
                "isValid": False,
                "errors": [str(e)]
            }
    
    def extract_content(self, file_content: bytes) -> Dict[str, Any]:
        """Extract OpenSpec content from zip file and build tree structure."""
        spec_tree = []
        
        try:
            with zipfile.ZipFile(io.BytesIO(file_content)) as zip_file:
                # Helper to find or create a node in the tree
                def find_or_create_node(tree: List[Dict], path_parts: List[str], full_path: str) -> Dict:
                    current_level = tree
                    current_path = ""
                    
                    for i, part in enumerate(path_parts):
                        is_file = (i == len(path_parts) - 1)
                        current_path = os.path.join(current_path, part).replace("\\", "/")
                        
                        # Find existing node
                        found = None
                        for node in current_level:
                            if node["name"] == part:
                                found = node
                                break
                        
                        if found:
                            if is_file:
                                return found
                            current_level = found["children"]
                        else:
                            # Create new node
                            new_node = {
                                "id": str(uuid4()),
                                "name": part,
                                "path": full_path if is_file else current_path,
                                "type": "file" if is_file else "directory",
                                "content": "",
                                "children": [],
                                "suggestions": []
                            }
                            
                            # Identify specific folder types for icon coloring
                            if not is_file:
                                if part.lower() == "changes":
                                    new_node["type"] = "change"
                            
                            current_level.append(new_node)
                            
                            if not is_file:
                                current_level = new_node["children"]
                            else:
                                return new_node

                for entry_path in sorted(zip_file.namelist()):
                    # Skip skipped directories/files
                    if entry_path.endswith('/') or '__MACOSX' in entry_path or entry_path.startswith('.'):
                        continue
                    
                    # Normalize path
                    path_parts = entry_path.strip('/').split('/')
                    file_name = path_parts[-1]
                    
                    # Only process markdown files, but let the tree builder handle structure
                    if file_name.endswith('.md'):
                        try:
                            content = zip_file.read(entry_path).decode('utf-8')
                            node = find_or_create_node(spec_tree, path_parts, entry_path)
                            node["content"] = content
                            node["type"] = "specification" # Mark files as specifications
                        except Exception as e:
                            print(f"Error reading {entry_path}: {e}")
                            continue

            return {
                "specTree": spec_tree,
                "rootSpec": None
            }
            
        except Exception as e:
            raise Exception(f"Failed to extract OpenSpec content: {str(e)}")
    
    async def save_uploaded_file(
        self,
        project_id: str,
        filename: str,
        content: bytes
    ) -> str:
        """Save an uploaded file to the temp directory."""
        project_dir = self.temp_dir / project_id
        project_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = project_dir / filename
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return str(file_path)
