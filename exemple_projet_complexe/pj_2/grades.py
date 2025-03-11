def is_valid_grade(grade):
    if type(grade) != int:
        return False
    return 0 <= grade <= 100


def calculate_average(grades):
    if len(grades) == 0:
        return 0
    total = sum(grades)
    return total / len(grades)
