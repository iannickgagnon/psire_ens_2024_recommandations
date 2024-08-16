def analyser_clients(liste_noms, liste_ages):
    """
    Fonction qui trie les passagers reçus en paramètre, donc qui ont un nom et un âge
    associé à un numéro de billet, en fonction de leur âge. Le nom ne doit pas être vide,
    et l'âge doit être entre 0 et 120.

    Arguments:
        liste_noms (list): Liste de dictionnaires de paire numéro de billet-nom du passager
        liste_ages (list): Liste de dictionnaires de paire numéro de billet-âge du passager

    Retourne :
        (dict): Passagers valides triés en catégorie d'âge
    """

    # Initialiser les listes de passagers selon l'âge
    bambins = []
    enfants = []
    juniors = []
    etudiants = []
    adultes = []
    aines = []
    ages_or = []

    for nom in liste_noms:
        # Vérifier si le numéro existe dans la liste des âges
        j = 0
        valide = False
        while j < len(liste_ages) and not valide:
            # Âge correspondant trouvé
            if list(liste_ages[j].keys())[0] == list(nom.keys())[0] and list(nom.values())[0] != '' \
                    and 0 < list(liste_ages[j].values())[0] <= 120:
                # Ajouter le passager à la liste correspondante à son âge
                age = list(liste_ages[j].values())[0]
                passager = list(nom.values())[0]
                if (age <= 2):
                    bambins.append(passager)
                elif (age <= 5):
                    enfants.append(passager)
                elif (age <= 12):
                    juniors.append(passager)
                elif (age <= 25):
                    etudiants.append(passager)
                elif (age <= 49):
                    adultes.append(passager)
                elif (age <= 64):
                    aines.append(passager)
                else:
                    ages_or.append(passager)

                # Indiquer que le passager est valide pour sortir de la boucle
                valide = True
            else:
                # Passer au prochain numéro
                j += 1

    # Retourner les listes et le profit
    return {'bambin': bambins, 'enfant': enfants, 'junior': juniors, 'etudiant': etudiants,
            'adulte': adultes, 'aine': aines, 'age_or': ages_or}
