def analyser_clients(liste_noms, liste_ages):
    """
    Programme qui trie des passagers en différentes listes en fonction de leur âge à
    partir d'une liste de noms et une d'âges correspondants.

    Elle retourne toutes ces listes de ainsi que le profit réalisé par la vente de
    billets.

    Arguments:
        liste_noms (list): Liste de dictionnaires de paire numéro de billet-nom du passager
        liste_ages (list): Liste de dictionnaires de paire numéro de billet-âge du passager

    Retourne :
        (tuple): Passagers valides triés en catégorie d'âge et profit réalisé
    """

    # Constante des différents profits (billet - 1$)
    PROFIT_ENFANT = 0.5
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
    profit_enfant = 0
    profit_junior = 0
    profit_etudiant = 0
    profit_adulte = 0
    profit_aine = 0
    profit_age_or = 0
    profit_total = 0

    for i in range(len(liste_noms)):
        identifiant = list(liste_noms[i].keys())[0]
        # Vérifier si le numéro existe dans la liste des âges
        j = 0
        valide = False
        while j < len(liste_ages) and not valide:
            # Âge correspondant trouvé
            if list(liste_ages[j].keys())[0] == identifiant and liste_noms[i][identifiant] != '' \
                    and 0 < list(liste_ages[j].values())[0] <= 120:
                # Ajouter le passager à la liste en fonction de son âge et modifier le profit
                age = list(liste_ages[j].values())[0]
                passager = liste_noms[i][identifiant]
                if (age <= 2):
                    bambins.append(passager)
                elif (age <= 5):
                    enfants.append(passager)
                    profit_enfant += PROFIT_ENFANT
                    profit_total += PROFIT_ENFANT
                elif (age <= 12):
                    juniors.append(passager)
                    profit_junior += PROFIT_JUNIOR
                    profit_total += PROFIT_JUNIOR
                elif (age <= 25):
                    etudiants.append(passager)
                    profit_etudiant += PROFIT_ETUDIANT
                    profit_total += PROFIT_ETUDIANT
                elif (age <= 50):
                    adultes.append(passager)
                    profit_adulte += PROFIT_ADULTE
                    profit_total += PROFIT_ADULTE
                elif (age <= 65):
                    aines.append(passager)
                    profit_aine += PROFIT_AINE
                    profit_total += PROFIT_AINE
                else:
                    ages_or.append(passager)
                    profit_age_or += PROFIT_AGE_OR
                    profit_total += PROFIT_AGE_OR

                # Indiquer que le passager est valide pour sortir de la boucle
                valide = True
            else:
                # Passer au prochain numéro
                j += 1

    # Assert si les listes sont toutes vides
    if len(bambins) == 0 and len(enfants) == 0 and len(juniors) == 0 and len(etudiants) == 0 \
            and len(adultes) == 0 and len(aines) == 0 and len(ages_or) == 0:
        assert ('Les listes filtrées sont vides.')

    # Retourner les listes et le profit
    return {'noms': bambins, 'profit': 0}, {'noms': enfants, 'profit': profit_enfant}, \
        {'noms': juniors, 'profit': profit_junior}, {'noms': etudiants, 'profit': profit_etudiant}, \
        {'noms': adultes, 'profit': profit_adulte}, {'noms': aines, 'profit': profit_aine}, \
        {'noms': ages_or, 'profit': profit_age_or}, profit_total
