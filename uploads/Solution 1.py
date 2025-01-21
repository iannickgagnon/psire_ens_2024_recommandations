def analyser_clients(liste_noms, liste_ages):
    """
    Programme qui trie des passagers en différentes listes en fonction de leur âge à
    partir d'une liste de noms et une d'âges correspondants.

    Elle retourne un nouveau dictionnaire contenant les listes de passagers valides et
    le profit réalisé par la vente de billets. Pour être valide, un passager doit avoir
    un nom et un âge associé à un numéro de billet unique. L'âge doit être entre 0 et 120,
    et le nom ne doit pas être une chaîne de caractères vide.

    Arguments:
        liste_noms (list): Liste de dictionnaires de paire numéro de billet-nom du passager
        liste_ages (list): Liste de dictionnaires de paire numéro de billet-âge du passager

    Retourne :
        (dict): Passagers valides triés en catégorie d'âge et profit réalisé
    """

    # Constante des différents profits
    PROFIT_ENFANT = 0.5
    PROFIT_JUNIOR = 1.0
    PROFIT_ETUDIANT = 2.0
    PROFIT_ADULTE = 3.5
    PROFIT_AINE = 2.5
    PROFIT_AGE_OR = 1.5

    # Listes de passagers selon l'âge
    bambins = []
    enfants = []
    juniors = []
    etudiants = []
    adultes = []
    aines = []
    ages_or = []

    # Profits sur la vente des billets
    profit_enfant = 0
    profit_junior = 0
    profit_etudiant = 0
    profit_adulte = 0
    profit_aine = 0
    profit_age_or = 0

    for billet_nom in liste_noms:
        # Extraire le premier numéro de billet
        identifiant = list(billet_nom.keys())[0]
        nom = billet_nom[identifiant]
        if nom != '':
            # Vérifier si le numéro existe dans la liste des âges
            i = 0
            valide = False
            while i < len(liste_ages) and not valide:
                billet_age = list(liste_ages[i].keys())[0]
                age = liste_ages[i][billet_age]
                # Âge valide et billet correspondant
                if age > 0 and age <= 120 and billet_age == identifiant:
                    # Ajouter le nom à la liste du bon âge et modifier le profit
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

                    # Indiquer que le passager est valide pour sortir de la boucle
                    valide = True
                else:
                    # Passer au prochain numéro
                    i += 1

    # Vérifier que les listes ne sont pas nulles
    if len(bambins) == 0 and len(enfants) == 0 and len(juniors) == 0 and len(etudiants) == 0 \
            and len(adultes) == 0 and len(aines) == 0 and len(ages_or) == 0:
        assert ('Les listes filtrées sont vides.')

    # Retourner les listes et le profit dans un dictionnaire
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
