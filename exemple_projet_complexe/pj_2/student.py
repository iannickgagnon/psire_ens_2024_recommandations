class Student:
    def __init__(self, name):
        self.name = name
        self.grades = []

    def add_grade(self, grade):
        if grade < 0 or grade > 100:
            print("Erreur : La note doit être entre 0 et 100.")
        else:
            self.grades.append(grade)

    def calculate_average(self):
        if len(self.grades) == 0:
            return 0
        total = sum(self.grades)
        return total / len(self.grades)
