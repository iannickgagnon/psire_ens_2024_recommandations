def is_valid_grade(grade):
    """Retourne True si la note est un nombre valide (entre 0 et 100), sinon False."""
    try:
        grade = float(grade)
        return 0 <= grade <= 100
    except ValueError:
        return False


def calculate_average(grades):
    """Retourne la moyenne des notes."""
    if len(grades) == 0:
        return 0
    return sum(grades) / len(grades)
