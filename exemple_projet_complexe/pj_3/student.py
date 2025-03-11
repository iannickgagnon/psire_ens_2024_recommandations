class Student:
    def __init__(self, name):
        self.name = name
        self.grades = []

    def add_grade(self, grade):
        if not isinstance(grade, (int, float)):
            raise ValueError("La note doit être un nombre.")
        self.grades.append(grade)

    def calculate_average(self):
        if len(self.grades) == 0:
            return None
        return sum(self.grades) / len(self.grades)
