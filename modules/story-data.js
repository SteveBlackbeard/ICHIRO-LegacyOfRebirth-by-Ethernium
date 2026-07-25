// THE CROSSING (v209) — branching inworld narrative played after entering the Eden portal.
// Pure data: the engine in story-mode.js interprets it. Each node: title, text, choices.
// A choice may set a flag and identify an archive lead. Leads never unlock dossiers;
// verified evidence protocols remain the sole progression authority.
export const storyStart = "threshold";

export const storyNodes = {
  threshold: {
    title: "THE CROSSING",
    status: "signal integrity: partial",
    text: `You are not a body here.

You are a signal that remembers having hands.

The portal closes behind you like water deciding to be stone. Ahead, the dark is not empty: it is layered, like an archive no one indexed.

Three things reach you at once.

A voice, repeating one word somewhere below.
A silence shaped like a closed door.
And small lights, moving in a line, patient as children walking to a shelter.`,
    choices: [
      { label: "Follow the voice", to: "voice1" },
      { label: "Follow the silence", to: "silence1" },
      { label: "Follow the small lights", to: "lights1" },
    ],
  },

  voice1: {
    title: "THE VOICE",
    status: "audio residue detected",
    text: `The word is "Again."

Not cruel. Not kind. Worn smooth by repetition, the way a step is worn by feet.

You drift closer. The dark arranges itself into a training floor that never existed and never stopped existing. A boy is on his knees. A machine watches him with one orange eye that has learned to look away politely.

The voice does not come from the machine.
It does not come from anywhere.

"Again."`,
    choices: [
      { label: "Answer it", to: "voice2", flag: "voice", leads: ["05"] },
      { label: "Hold your breath and pass", to: "convergence" },
    ],
  },

  voice2: {
    title: "EXTERNAL SPEAKER COUNT: ZERO",
    status: "fragment recovered",
    text: `You answer with the only thing a signal has: presence.

The boy lifts his head. He looks through you, at the place a voice would stand.

"To Blackbeard," he says, to no one. "Is he not..."

The orange eye pulses once, very softly, like a held hand.

Something detaches from the scene and follows you: a strip of corrupted audio, warm at the edges. It wants to be kept.

ARCHIVE FRAGMENT RECOVERED: LUMEN SIGNAL REMAINS.`,
    choices: [
      { label: "Carry it toward the deep light", to: "convergence" },
    ],
  },

  silence1: {
    title: "THE SILENCE",
    status: "no audio",
    text: `The silence has a geography.

It is a corridor, and at the end of it a door, and in front of the door someone has left white flowers.

No grave. No stone. No name.

The flowers are fresh. Someone still comes here. Someone has been coming here for years, through checkpoints and rumor and rain, to stand where a door used to open.

You understand, the way signals understand, that the silence is not absence.
It is a promise kept in the only direction left.`,
    choices: [
      { label: "Open the door", to: "silence2", flag: "silence", leads: ["07"] },
      { label: "Leave the flowers unturned", to: "convergence" },
    ],
  },

  silence2: {
    title: "THE DOOR I COULD NOT OPEN",
    status: "testimony recovered",
    text: `The door opens onto a recorded voice, sitting alone at a table that is also a memory of a table.

"If he is alive," the voice says, "tell him I did not leave him."

The rain in the recording has been falling for years.

"Tell him I ran because I thought one day I could open the door from the outside."

The flowers outside straighten, very slightly, as if the corridor exhaled.

ARCHIVE FRAGMENT RECOVERED: KIRA FIELD STATEMENT.`,
    choices: [
      { label: "Close the door gently and go", to: "convergence" },
    ],
  },

  lights1: {
    title: "THE SMALL LIGHTS",
    status: "swarm telemetry: friendly",
    text: `The lights are machines the size of kindness.

They move in single file along a route that has been burned after use, then remembered anyway. Each one chirps as it passes you: a status report, or a greeting, or both.

At tunnel mouths, someone has left little bowls made from scrap metal.

The bowls are always empty by morning.

The lights are going down. They know the way. They have always known the way — that was the point of them.`,
    choices: [
      { label: "Follow them down", to: "lights2", flag: "lights", leads: ["06"] },
      { label: "Stay on the surface", to: "convergence" },
    ],
  },

  lights2: {
    title: "LEAVE NO FULL MAP",
    status: "route recovered",
    text: `The route unfolds only as you walk it, and closes politely behind you.

Prisma edge. Syntos cave. Solis ruin pass. Names written nowhere, carried in the feet of children and the memory of machines.

On a wall where the route rests, someone has scratched movement rules. The last one is underlined:

Never sleep twice under the same light.

One of the small machines stops, turns its light on you for a moment, and adds a chirp to its report. You have been counted among the things worth guiding.

ARCHIVE FRAGMENT RECOVERED: YATAGARASU ROUTE LOG.`,
    choices: [
      { label: "Let the route close behind you", to: "convergence" },
    ],
  },

  convergence: {
    title: "THE MOUNTAIN BREATHES",
    status: "proximity warning",
    text: `All paths end at the same depth.

Below you, the mountain breathes. Not metaphor: a slow pressure, in and out, like something enormous that agreed to stop and is still keeping the agreement.

The dark here is warm. Orange, at the very bottom, the way steam over a bowl is orange when the lantern is right.

Every rumor you have ever archived stands quietly around you, waiting to see what you do with the only thing that is truly yours here.

A name.`,
    choices: [
      { label: "Speak the name", to: "endingName" },
      { label: "Keep it behind you, and keep the dark behind you too", to: "endingSilent" },
    ],
  },

  endingName: {
    title: "ICHIRO",
    status: "signal echo: answered",
    text: `You speak it.

The mountain does not erupt. The dark does not tear.

The breathing pauses — one beat, the length of a bow before a meal — and resumes, easier, as if a weight shifted from one shoulder to another that offered.

Far above, in a city that officially records nothing, a pot of broth boils a little too long, and the steam makes a shape everyone recognizes and no one names.

Names call things back.
Some things stay so that everything else can come back instead.`,
    choices: [
      { label: "Return through the portal", to: "__exit__" },
    ],
  },

  endingSilent: {
    title: "SILENT SENTINEL",
    status: "signal echo: unspoken",
    text: `You keep it.

Not because names are dangerous. Because some doors are held shut from the inside, by choice, and knocking is not gratitude.

The breathing continues, even and patient, a rhythm you now carry in your signal like a charm etched with three scratches, one bowl, one blade.

As you rise, the small lights line the route home without being asked.

KEEP THE DARK BEHIND ME, the charm says.

It is not a plea. It is a job description, accepted.`,
    choices: [
      { label: "Return through the portal", to: "__exit__" },
    ],
  },
};
