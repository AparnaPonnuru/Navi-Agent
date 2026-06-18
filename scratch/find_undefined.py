import ast
import sys

def check_undefined_names(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())

    # Build a list of all defined names globally and in functions
    imported_names = set()
    global_names = set()
    
    # We will track variables defined in functions
    builtins = set(dir(__builtins__))
    
    class Visitor(ast.NodeVisitor):
        def __init__(self):
            self.current_func = None
            self.local_defs = {}
            self.undefined = []

        def visit_Import(self, node):
            for alias in node.names:
                imported_names.add(alias.asname or alias.name)
            self.generic_visit(node)

        def visit_ImportFrom(self, node):
            for alias in node.names:
                imported_names.add(alias.asname or alias.name)
            self.generic_visit(node)

        def handle_function(self, node):
            old_func = self.current_func
            self.current_func = node.name
            self.local_defs[node.name] = set()
            # Add parameters to local definitions
            for arg in node.args.args:
                self.local_defs[node.name].add(arg.arg)
            if node.args.vararg:
                self.local_defs[node.name].add(node.args.vararg.arg)
            if node.args.kwarg:
                self.local_defs[node.name].add(node.args.kwarg.arg)
            for arg in node.args.kwonlyargs:
                self.local_defs[node.name].add(arg.arg)
            
            # Visit body
            self.generic_visit(node)
            self.current_func = old_func

        def visit_FunctionDef(self, node):
            self.handle_function(node)

        def visit_AsyncFunctionDef(self, node):
            self.handle_function(node)

        def visit_Assign(self, node):
            # Track variables being defined
            for target in node.targets:
                if isinstance(target, ast.Name):
                    if self.current_func:
                        self.local_defs[self.current_func].add(target.id)
                    else:
                        global_names.add(target.id)
                elif isinstance(target, (ast.Tuple, ast.List)):
                    for elt in target.elts:
                        if isinstance(elt, ast.Name):
                            if self.current_func:
                                self.local_defs[self.current_func].add(elt.id)
                            else:
                                global_names.add(elt.id)
            self.generic_visit(node)

        def visit_For(self, node):
            if isinstance(node.target, ast.Name):
                if self.current_func:
                    self.local_defs[self.current_func].add(node.target.id)
                else:
                    global_names.add(node.target.id)
            elif isinstance(node.target, (ast.Tuple, ast.List)):
                for elt in node.target.elts:
                    if isinstance(elt, ast.Name):
                        if self.current_func:
                            self.local_defs[self.current_func].add(elt.id)
                        else:
                            global_names.add(elt.id)
            self.generic_visit(node)

        def visit_ExceptHandler(self, node):
            if node.name:
                if self.current_func:
                    self.local_defs[self.current_func].add(node.name)
                else:
                    global_names.add(node.name)
            self.generic_visit(node)

        def visit_Name(self, node):
            # If name is being loaded/read, check if it is defined
            if isinstance(node.ctx, ast.Load):
                name = node.id
                # Check if it's a builtin, imported, or global name
                if name in builtins or name in imported_names or name in global_names:
                    return
                # Check function definitions as globals/builtins (e.g. function calls)
                if name in self.local_defs: # function defined in this file
                    return
                # Check if it's local to the current function
                if self.current_func and name in self.local_defs[self.current_func]:
                    return
                # Add to undefined list
                self.undefined.append((self.current_func, name, node.lineno))

    visitor = Visitor()
    # First gather imports and functions
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            visitor.local_defs[node.name] = set()
    visitor.visit(tree)
    
    # Print results
    for func, name, line in visitor.undefined:
        print(f"Line {line} in function {func or 'global'}: Undefined Name '{name}'")

if __name__ == '__main__':
    check_undefined_names('code/main.py')
