from student import Student


def get_student_input():
    name = input("Entrez le nom de l'étudiant : ")
    student = Student(name)
    while True:
        grade_input = input(
            f"Entrez la note pour {name} (entre 0 et 100, ou tapez 'done' pour finir) : ")
        if grade_input == 'done':
            break
        try:
            grade = int(grade_input)
            student.add_grade(grade)
        except ValueError:
            print("Erreur : Entrez une note valide.")
    return student


def display_results(student):
    print(f"Étudiant : {student.name}")
    print(f"Notes : {student.grades}")
    print(f"Moyenne des notes : {student.calculate_average()}")
