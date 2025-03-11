def analyser_clients(noms, ages):
    """
    Dans cette fonction, les passagers en paramètres sont triés en fonction de leur
    âge. Les catégories sont retournées avec le profit de la vente de billets.

    Arguments:
        noms_passagers (list): Noms des passagers
        ages_passagers (list): Âges des passagers

    Retourne :
        (dict): Catégories des passagers
    """

    # Catégories des passagers
    cat1 = []  # Bambin
    cat2 = []  # Enfant
    cat3 = []  # Junior
    cat4 = []  # Étudiant
    cat5 = []  # Adulte
    cat6 = []  # Ainé
    cat7 = []  # Age d'or

    # Nombre de passagers dans chaque catégorie
    nb1 = 0
    nb2 = 0
    nb3 = 0
    nb4 = 0
    nb5 = 0
    nb6 = 0
    nb7 = 0

    # Classer les passagers par âge
    for live in noms:
        num1 = list(live.keys())[0]
        quantité = len(ages)
        j = 0
        Flag = False
        while j < quantité and not Flag:
            ageLive = ages[j]
            # Numéro concordant
            if num1 == list(ageLive.keys())[0] and live[num1] != '' and 0 < list(ageLive.values())[0] <= 120:
                à_Ajouter = live[num1]
                # Ajouter le passager à la liste en fonction de son âge
                if (list(ageLive.values())[0] <= 2):
                    cat1.append(à_Ajouter)
                    nb1 += 1
                elif (list(ageLive.values())[0] <= 5):
                    cat2.append(à_Ajouter)
                    nb2 += 1
                elif (list(ageLive.values())[0] <= 12):
                    cat3.append(à_Ajouter)
                    nb3 += 1
                elif (list(ageLive.values())[0] <= 25):
                    cat4.append(à_Ajouter)
                    nb4 += 1
                elif (list(ageLive.values())[0] <= 50):
                    cat5.append(à_Ajouter)
                    nb5 += 1
                elif (list(ageLive.values())[0] <= 65):
                    cat6.append(à_Ajouter)
                    nb6 += 1
                else:
                    cat7.append(à_Ajouter)
                    nb7 += 1

                # Indicatif pour sortir de la boucle
                Flag = True
            else:
                j += 1

    # Assert si les listes sont toutes vides
    if nb1 and nb2 and nb3 and nb4 and nb5 and nb6 and nb7:
        assert ('Les listes filtrées sont vides.')

    # Mettre les catégories dans un dictionnaire
    final = {
        'bambin': {'noms': cat1, 'profit': 0},
        'enfant': {'noms': cat2, 'profit': nb2*0.5},
        'junior': {'noms': cat3, 'profit': nb3},
        'etudiant': {'noms': cat4, 'profit': nb4*2},
        'adulte': {'noms': cat5, 'profit': nb5*3.5},
        'aine': {'noms': cat6, 'profit': nb6*2.5},
        'age_or': {'noms': cat7, 'profit': nb7*1.5}
    }

    # Calculer le profit et ajouter au dictionnaire
    vente = nb2*0.5 + nb3 + nb4*2 + nb5*3.5 + nb6*2.5 + nb7*1.5

    final['profit'] = vente

    return final


noms = [{1: 'Ashwinia Yogarajah'},
        {3: 'Aline Sec'},
        {4: 'Aurélie Nguyen'},
        {5: 'Versha Amir'},
        {9: 'Amorella Lenga'},
        {10: 'Chaina Twacy Toussaint'},
        {12: 'Tina Ameziane'},
        {13: 'Thierry Pouliot'},
        {14: 'Fazil Boudjerada'},
        {17: 'Martin Rolo Dussault'},
        {18: 'Romain Granger-Naud'}]
ages = [{1: 21},
        {2: 2},
        {3: 46},
        {9: 54},
        {12: 1},
        {13: 7},
        {14: 4},
        {15: 14},
        {18: 14},
        {17: 89},]

tri = analyser_clients(noms, ages)
print(tri)
