from grades import is_valid_grade


def get_student_input():
    """Demande à l'utilisateur d'entrer le nom de l'étudiant et les notes."""
    name = input("Entrez le nom de l'étudiant : ")
    grades = []
    while True:
        grade = input(
            f"Entrez une note pour {name} (entre 0 et 100, ou tapez 'done' pour finir) : ")
        if grade.lower() == 'done':
            break
        if is_valid_grade(grade):
            grades.append(float(grade))
        else:
            print("Note invalide, veuillez entrer une note entre 0 et 100.")
    return name, grades


def display_results(student):
    """Affiche les résultats de l'étudiant."""
    print(f"\nÉtudiant : {student.name}")
    print(f"Notes : {student.grades}")
    print(f"Moyenne des notes : {student.calculate_average():.2f}")
