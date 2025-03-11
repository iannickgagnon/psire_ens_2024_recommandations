def analyser_clients(liste_noms, liste_ages):
    """
    Cette fonction classe les passagers selon leur âge en joignant une liste de
    noms et d'âges. Elle retourne un nouveau dictionnaire contenant les listes des
    noms des passagers et le profit réalisé par la vente de billets.

    Arguments:
        liste_noms (list): Liste de dictionnaires de paire numéro de billet-nom du passager
        liste_ages (list): Liste de dictionnaires de paire numéro de billet-âge du passager

    Retourne :
        (dict): Passagers triés en catégorie d'âge et profit réalisé
    """

    # Constante des différents profits (billet - 1$)
    PROFIT_ENFANT = 1.5
    PROFIT_JUNIOR = 1.0
    PROFIT_ETUDIANT = 2.0
    PROFIT_ADULTE = 3.5
    PROFIT_AINE = 2.5
    PROFIT_AGE_OR = 1.5

    # Initialiser les listes de passagers selon l'âge
    bambins = []
    enfants = []
    juniors = []
    etudiants = []
    adultes = []
    aines = []
    ages_or = []
    # Profit sur la vente de billets
    profit = 0

    # Copier les âges dans les listes d'âge
    for i in range(len(liste_ages)):
        age = list(liste_ages[i].values())[0]
        # Créer le passager, avec son nom initialisé avec une chaîne vide
        passager = ''

        # Trouver le nom correspondant au numéro
        j = 0
        trouve = False
        while j < len(liste_noms) and not trouve:
            if list(liste_ages[i].keys())[0] == list(liste_noms[j].keys())[0]:
                passager = list(liste_noms[j].values())[0]
                trouve = True
            else:
                j += 1

        # Ajouter le passager à la catégorie et calculer le profit
        if (age <= 2):
            bambins.append(passager)
        elif (age <= 5):
            enfants.append(passager)
            profit += PROFIT_ENFANT
        elif (age <= 12):
            juniors.append(passager)
            profit += PROFIT_JUNIOR
        elif (age <= 25):
            etudiants.append(passager)
            profit += PROFIT_ETUDIANT
        elif (age <= 50):
            adultes.append(passager)
            profit += PROFIT_ADULTE
        elif (age <= 65):
            aines.append(passager)
            profit += PROFIT_AINE
        else:
            ages_or.append(passager)
            profit += PROFIT_AGE_OR

    # Retourner les listes et le profit dans un dictionnaire
    return {
        'bambin': {'noms': bambins, 'profit': 0},
        'enfant': {'noms': enfants, 'profit': len(enfants)*PROFIT_ENFANT},
        'junior': {'noms': juniors, 'profit': len(juniors)*PROFIT_JUNIOR},
        'etudiant': {'noms': etudiants, 'profit': len(etudiants)*PROFIT_ETUDIANT},
        'adulte': {'noms': adultes, 'profit': len(adultes)*PROFIT_ADULTE},
        'aine': {'noms': aines, 'profit': len(aines)*PROFIT_AINE},
        'age_or': {'noms': ages_or, 'profit': len(ages_or)*PROFIT_AGE_OR},
        'profit': len(enfants)*PROFIT_ENFANT + len(juniors)*PROFIT_JUNIOR +
        len(etudiants)*PROFIT_ETUDIANT + len(adultes)*PROFIT_ADULTE + len(aines)*PROFIT_AINE +
        len(ages_or)*PROFIT_AGE_OR
    }
