Attribute VB_Name = "FBaseConnector"
'Nom de la branche pointage.
'cette valeur doit correspondre au fichier de connexion fournis aux appli android
'ainsi qu'au fichier .env du connecteur
Public Const Branche = ""

'Token du bot Telegram pour l'envoie des incidents depuis l'application
Public Const Telegram_Token = ""

'Destinataires pour les messages Telegram, séparés par des ";"
Public Const Telegram_Destinataires = ""



Public ConnectorPath As String
Public scriptPath As String
Public Data_Path As String

Sub InitDataPath()

    'Chemin d'accès au dossier ou se trouve le script NodeJS du connecteur.
    'Ici il est dans le dossier parent mais tu pourrais placer ton excel ailleurs et donc changer cette adresse
    ConnectorPath = ThisWorkbook.Path & "\..\Connector"
    
    'Les deux variable ci dessous ne doivent pas être modifiées, elle dépendent directement de l'emplacement du dossier connector et de la branche
    ' Chemin vers le fichier index.js dans le dossier du connecteur
    scriptPath = """" & ConnectorPath & "\index.js" & """"
    'Chemin ou se trouverons les données téléchargées
    Data_Path = ConnectorPath & "\data\" & Branche & "\"
    
End Sub

Sub RunNodeScript(operation As String, section As String, Optional tempFile As Boolean = False)
    Dim shell As Object
    
    Dim command As String
    Dim exitCode As Long
    Dim waitOnReturn As Boolean
    Dim windowStyle As Integer
    
    ' Créer l'objet WScript.Shell
    Set shell = CreateObject("WScript.Shell")
    
    ' Construire la commande à exécuter
    command = "node " & scriptPath & " -" & operation & " " & section
    If tempFile Then command = command & " -t"
    ' Exécuter la commande et attendre la fin
    waitOnReturn = True
    windowStyle = 1 ' 1 pour fenêtre normale, 0 pour caché
    exitCode = shell.Run(command, windowStyle, waitOnReturn)
    
    ' Vérifier le code de retour
    If exitCode <> 0 Then
        MsgBox "Le script Node.js a échoué avec le code de sortie: " & exitCode, vbExclamation
    End If
End Sub

Function NewDefaultCfgData() As Object
    Dim Data As Dictionary
    Set Data = New Dictionary
    
    'créé un dictionnaire avec les données du classeur
    Set Data.Item("DFT") = JsonConverter.ParseJson("{""Name"" : """",""Color"" : ""#B02020""}")
    Set Data.Item("Pause") = JsonConverter.ParseJson("{""Name"" : """",""Color"" : ""#5623B4""}")
    Set Data.Item("Fct1") = JsonConverter.ParseJson("{""Name"" : ""F1"",""Color"" : ""#00EE00""}")
    Set Data.Item("Fct2") = JsonConverter.ParseJson("{""Name"" : ""F2"",""Color"" : ""#00EEEE""}")
    Set Data.Item("Fct3") = JsonConverter.ParseJson("{""Name"" : ""F3"",""Color"" : ""#EE00EE""}")
    Set Data.Item("Fct4") = JsonConverter.ParseJson("{""Name"" : ""F4"",""Color"" : ""#EEEE00""}")
    Set Data.Item("TgInf") = JsonConverter.ParseJson("{""dest"" : """ & Telegram_Destinataires & """,""token"" : """ & Telegram_Token & """}")
    
    Set NewDefaultCfgData = Data
End Function

Function addUserToDict(Dict As Object, Code As String, Name As String)

Set Dict.Item(Code) = JsonConverter.ParseJson("{""Name"" : """ & Trim(Name) & """}")

End Function
'Ces fonctions convertissent les valeurs de couleurs entre Android et VBA, en VBA une couleur est au format &hBBGGRR alors que sous android c'est #RRGGBB
Function ColorToHex(cell As Range) As String
    Dim colorValue As Long
    Dim red As Long
    Dim green As Long
    Dim blue As Long
    
    ' Récupérer la couleur de fond de la cellule
    colorValue = cell.Interior.Color
    
    ' Extraire les valeurs rouge, verte et bleue
    red = (colorValue And &HFF)
    green = (colorValue \ &H100 And &HFF)
    blue = (colorValue \ &H10000 And &HFF)
    
    ' Formater la chaîne en hexadécimal
    ColorToHex = "#" & Right("00" & Hex(red), 2) & Right("00" & Hex(green), 2) & Right("00" & Hex(blue), 2)
End Function

Function HexToColor(ByVal HexValue As String) As Long

HexToColor = CLng("&H" & Mid(HexValue, 6, 2) & Mid(HexValue, 4, 2) & Mid(HexValue, 2, 2))

End Function


