import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default () => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Bienvenue sur les Pick’em 🔮')
            .setColor(Colors.DarkPurple)
            .setDescription(`
                Si tu souhaites participer au jeu des Pick’em, tu es tombé au bon endroit !
                Pour connaître les règles clique sur ce lien : http://tinyurl.com/yjz3n2sz
                Clique sur le bouton ci-dessous pour te joindre à la partie 😉
            `)
            .setImage('attachment://pickem.png')
    ],
    files: [
        new AttachmentBuilder('assets/images/pickem.png')
    ]
})