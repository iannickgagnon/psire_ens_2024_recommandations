def analyser_clients(liste_noms, liste_ages):
    """
    La fonction trie les passagers selon l'âge. Elle calcule aussi le profit.

    Arguments:
        liste_noms (list): Liste de noms
        liste_ages (list): Liste d'âges

    Retourne :
        (dict): Passagers triés
    """

    # Prix
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
        # Quel numéro ?
        identifiant = list(billet_nom.keys())[0]
        nom = billet_nom[identifiant]
        # Nom peut pas être vide
        if nom != '':
            i = 0
            valide = False
            # Est-ce que le billet est dans les âges
            while i < len(liste_ages) and not valide:
                billet_age = list(liste_ages[i].keys())[0]
                age = liste_ages[i][billet_age]
                # Oui
                if age > 0 and age <= 120 and billet_age == identifiant:
                    # Bloc if-elif-else pour trier avec le bon âge
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

                    # Le passager a été mis dans la bonne liste
                    # Le profit a aussi été changé

                    # Exit de la boucle
                    valide = True
                # Non
                else:
                    i += 1

    # Assert si les listes sont toutes vides
    if len(bambins) == 0 and len(enfants) == 0 and len(juniors) == 0 and len(etudiants) == 0 \
            and len(adultes) == 0 and len(aines) == 0 and len(ages_or) == 0:
        assert ('Les listes filtrées sont vides.')

    # Mettre chaque liste avec sa catégorie et retourner le tout
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
