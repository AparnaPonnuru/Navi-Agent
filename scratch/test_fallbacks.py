import sys
import os
sys.path.append(os.path.abspath('code'))

from main import get_fallback_mock_roadmap

def run_tests():
    grades = ["10", "11", "12", "tenth", "eleventh", "twelfth", "university", None]
    focuses = ["Academic Focus", "Practical Focus", "Holistic Focus", None]
    
    success = True
    for grade in grades:
        for focus in focuses:
            profile = {"grade": grade, "performance": "90% and above"}
            current = "Grade 10" if grade is None else str(grade)
            goal = "Computer Science • Stanford University • USA"
            try:
                res = get_fallback_mock_roadmap(
                    current=current,
                    goal=goal,
                    profile=profile,
                    refine_prompt="add 5 steps",
                    focus=focus
                )
                assert isinstance(res, dict), "Should return dict"
                assert "macro_path" in res, "Should have macro_path"
            except Exception as e:
                print(f"Failed for grade={grade}, focus={focus}: {e}")
                success = False
                
    if success:
        print("All fallback mock roadmap tests passed successfully!")
    else:
        print("Some tests failed!")

if __name__ == '__main__':
    run_tests()
