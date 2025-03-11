from student import Student
from utils import get_student_input, display_results


def main():
    students = []
    while True:
        name, grades = get_student_input()
        student = Student(name)
        for grade in grades:
            student.add_grade(grade)
        students.append(student)

        another = input("Voulez-vous entrer un autre étudiant ? (oui/non) : ")
        if another.lower() != 'oui':
            break

    for student in students:
        display_results(student)


if __name__ == "__main__":
    main()
