def analyser_clients(liste_noms, liste_ages):
    PROFIT_ENFANT = 0.5
    PROFIT_JUNIOR = 1.0
    PROFIT_ETUDIANT = 2.0
    PROFIT_ADULTE = 3.5
    PROFIT_AINE = 2.5
    PROFIT_AGE_OR = 1.5

    bambins = []
    enfants = []
    juniors = []
    etudiants = []
    adultes = []
    aines = []
    ages_or = []
    profit_enfant = 0
    profit_junior = 0
    profit_etudiant = 0
    profit_adulte = 0
    profit_aine = 0
    profit_age_or = 0

    for billet_nom in liste_noms:
        identifiant = list(billet_nom.keys())[0]
        nom = billet_nom[identifiant]
        if nom != '':
            i = 0
            valide = False
            while i < len(liste_ages) and not valide:
                billet_age = list(liste_ages[i].keys())[0]
                age = liste_ages[i][billet_age]
                if age > 0 and age <= 120 and billet_age == identifiant:
                    if (age <= 2):
                        bambins.append(nom)
                    elif (age <= 5):
                        enfants.append(nom)
                        profit_enfant += PROFIT_ENFANT
                    elif (age <= 12):
                        juniors.append(nom)
                        profit_junior += PROFIT_JUNIOR
                    elif (age <= 25):
                        etudiants.append(nom)
                        profit_etudiant += PROFIT_ETUDIANT
                    elif (age <= 50):
                        adultes.append(nom)
                        profit_adulte += PROFIT_ADULTE
                    elif (age <= 65):
                        aines.append(nom)
                        profit_aine += PROFIT_AINE
                    else:
                        ages_or.append(nom)
                        profit_age_or += PROFIT_AGE_OR

                    valide = True
                else:
                    i += 1

    if len(bambins) == 0 and len(enfants) == 0 and len(juniors) == 0 and len(etudiants) == 0 \
            and len(adultes) == 0 and len(aines) == 0 and len(ages_or) == 0:
        assert ('Les listes filtrées sont vides.')

    return {
        'bambin': {'noms': bambins, 'profit': 0},
        'enfant': {'noms': enfants, 'profit': profit_enfant},
        'junior': {'noms': juniors, 'profit': profit_junior},
        'etudiant': {'noms': etudiants, 'profit': profit_etudiant},
        'adulte': {'noms': adultes, 'profit': profit_adulte},
        'aine': {'noms': aines, 'profit': profit_aine},
        'age_or': {'noms': ages_or, 'profit': profit_age_or},
        'profit': profit_enfant + profit_junior + profit_etudiant + profit_adulte +
        profit_aine + profit_age_or
    }
