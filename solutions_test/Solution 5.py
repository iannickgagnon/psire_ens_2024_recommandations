def analyser_clients(noms, ages):
    """
    La fonction "analyser_clients" sépare les passagers reçus en paramètre
    en fonction de leur âge. Seuls ceux qui ont un nom et un âge par numéro, que
    le nom n'est pas vide et que l'âge est entre 0 et 120 sont valides. Le profit
    sur la vente de billets est ajouté à la valeur de retour

    Arguments:
        liste_noms (list): Noms des passagers associés à un numéro de billet
        liste_ages (list): Âges des passagers associés à un numéro de billet

    Retourne :
        (dict): Classes de passagers et profit réalisé
    """

    # Prix des billets selon l'âge
    BILLET_ENFANT = 0.5
    BILLET_JUNIOR = 1
    BILLET_ETUDIANT = 2
    BILLET_ADULTE = 3.5
    BILLET_AINES = 2.5
    BILLET_AGE_OR = 1.5

    bambins = []
    enfants = []
    junior = []
    etudiant = []
    adultes = []
    aines = []
    ages_or = []

    # Classer les passagers par âge
    for billet_nom in noms:
        for billet_age in ages:
            # Âge correspondant trouvé
            if list(billet_nom.keys())[0] == list(billet_nom.keys())[0] and \
                    list(billet_nom.values())[0] != '' and 0 < list(billet_age.values())[0] <= 120:
                # Ajouter le passager à la liste en fonction de son âge
                if (list(billet_age.values())[0] <= 2):
                    bambins.append(list(billet_nom.values())[0])
                elif (list(billet_age.values())[0] <= 5):
                    enfants.append(list(billet_nom.values())[0])
                elif (list(billet_age.values())[0] <= 12):
                    juniors.append(list(billet_nom.values())[0])
                elif (list(billet_age.values())[0] <= 25):
                    etudiants.append(list(billet_nom.values())[0])
                elif (list(billet_age.values())[0] <= 50):
                    adultes.append(list(billet_nom.values())[0])
                elif (list(billet_age.values())[0] <= 65):
                    aines.append(list(billet_nom.values())[0])
                else:
                    ages_or.append(list(billet_nom.values())[0])

                # Sortir de la boucle
                break
    # Assert si les listes sont toutes vides
    if len(bambins) == 0 and len(enfants) == 0 and len(juniors) == 0 and len(etudiants) == 0 \
            and len(adultes) == 0 and len(aines) == 0 and len(ages_or) == 0:
        assert ('Les listes filtrées sont vides.')

    # Ajouter les noms et les profits au dictionnaire et retourner
    listes = {
        'bambin': {'noms': bambins, 'profit': 0},
        'enfant': {'noms': enfants, 'profit': len(enfants)*BILLET_ENFANT},
        'junior': {'noms': juniors, 'profit': len(juniors)*BILLET_JUNIOR},
        'etudiant': {'noms': etudiants, 'profit': len(etudiants)*BILLET_ETUDIANT},
        'adulte': {'noms': adultes, 'profit': len(adultes)*BILLET_ADULTE},
        'aine': {'noms': aines, 'profit': len(aines)*BILLET_AINE},
        'age_or': {'noms': ages_or, 'profit': len(ages_or)*BILLET_AGE_OR},
        'profit': len(enfants)*BILLET_ENFANT + len(juniors)*BILLET_JUNIOR +
        len(etudiants)*BILLET_ETUDIANT + len(adultes)*BILLET_ADULTE + len(aines)*BILLET_AINE +
        len(ages_or)*BILLET_AGE_OR
    }
    return listes
