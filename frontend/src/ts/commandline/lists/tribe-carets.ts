import * as UpdateConfig from "../../config";

const subgroup: MonkeyTypes.CommandsSubgroup = {
  title: "Tribe carets...",
  configKey: "tribeCarets",
  list: [
    {
      id: "setTribeCaretsOff",
      display: "off",
      configValue: "off",
      exec: (): void => {
        UpdateConfig.setTribeCarets("off");
      },
    },
    {
      id: "setTribeCaretsNoNames",
      display: "no names",
      configValue: "noNames",
      exec: (): void => {
        UpdateConfig.setTribeCarets("noNames");
      },
    },
    {
      id: "setTribeCaretsOn",
      display: "on",
      configValue: "on",
      exec: (): void => {
        UpdateConfig.setTribeCarets("on");
      },
    },
  ],
};

const commands: MonkeyTypes.Command[] = [
  {
    id: "changeTribeCarets",
    display: "Tribe carets...",
    icon: "fa-i-cursor",
    subgroup,
  },
];

export default commands;
