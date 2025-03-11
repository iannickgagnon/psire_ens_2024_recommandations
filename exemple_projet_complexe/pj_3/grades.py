def is_valid_grade(grade):
    if not isinstance(grade, (int, float)):
        return False
    if grade < 0 or grade > 100:
        return False
    return True


def calculate_average(grades):
    return sum(grades) / len(grades)
