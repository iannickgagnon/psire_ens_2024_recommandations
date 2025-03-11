def get_student_input():
    name = input("Entrez le nom de l'étudiant : ")
    student = Student(name)
    while True:
        try:
            grade_input = input(
                f"Entrez une note pour {name} (ou tapez 'done' pour finir) : ")
            if grade_input.lower() == 'done':
                break
            student.add_grade(float(grade_input))
        except ValueError:
            print("Erreur : La note doit être un nombre valide.")
    return student


def display_results(student):
    if student.calculate_average() is None:
        print(f"Aucune note n'a été entrée pour {student.name}.")
    else:
        print(f"Nom de l'étudiant : {student.name}")
        print(f"Notes : {student.grades}")
        print(f"Moyenne des notes : {student.calculate_average()}")
