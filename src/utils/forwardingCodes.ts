export const carrierCodes = {
  tmobile: {
    enable: (num: string) => `*21*${num}#`,
    disable: "##002#",
  },
  att: {
    enable: (num: string) => `*21*${num}#`,
    disable: "##002#",
  },
  verizon: {
    enable: (num: string) => `*72${num}`,
    disable: "*73",
  },
  other: {
    enable: (num: string) => `*21*${num}#`,
    disable: "##002#",
  },
};
