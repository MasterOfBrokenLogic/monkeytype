import * as TestWords from "../test/test-words";
import * as TestUI from "../test/test-ui";
import Config from "../config";
import { convertRemToPixels } from "../utils/misc";
import * as SlowTimer from "../states/slow-timer";
import { getRoom } from "./tribe-state";
import tribeSocket from "./tribe-socket";
import * as LineJumpEvent from "../observables/line-jump-event";
import * as ThemeColors from "../elements/theme-colors";
import * as ConfigEvent from "../observables/config-event";

const carets: { [key: string]: TribeCaret } = {};

export class TribeCaret {
  private element: JQuery<HTMLElement> | undefined;

  constructor(
    private socketId: string,
    private wordIndex: number,
    private letterIndex: number,
    private name: string
  ) {
    this.socketId = socketId;
    this.wordIndex = wordIndex;
    this.letterIndex = letterIndex;
    this.name = name;
  }

  public spawn(): void {
    if (this.element) {
      return this.destroy();
    }
    //create element and store
    const element = document.createElement("div");
    element.classList.add("tribeCaret", "default");
    element.style.fontSize = Config.fontSize + "rem";
    element.setAttribute("socketId", this.socketId);
    (document.querySelector(".pageTest #wordsWrapper") as HTMLElement).prepend(
      element
    );

    //create caretName element, fill the name and insert inside element
    const caretName = document.createElement("div");
    caretName.classList.add("caretName");

    if (Config.tribeCarets === "noNames") {
      caretName.classList.add("hidden");
    }

    caretName.innerText = this.name;
    element.appendChild(caretName);

    this.element = $(element);
  }

  public setNameVisibility(visibility: boolean): void {
    if (this.element) {
      if (visibility) {
        this.element.find(".caretName").removeClass("hidden");
      } else {
        this.element.find(".caretName").addClass("hidden");
      }
    }
  }

  public destroy(): void {
    if (!this.element) {
      return;
    }
    this.element.remove();
    this.element = undefined;
  }

  public updatePosition(newWordIndex: number, newLetterIndex: number): void {
    if (newWordIndex < this.wordIndex) return;
    this.wordIndex = newWordIndex;
    this.letterIndex = newLetterIndex;
  }

  public animate(animationDuration: number): void {
    if (!this.element) {
      this.spawn();
      return this.animate(125);
    }
    // if ($("#paceCaret").hasClass("hidden")) {
    //   $("#paceCaret").removeClass("hidden");
    // }

    let animationLetterIndex = this.letterIndex;
    let animationWordIndex = this.wordIndex;

    try {
      //move to next word if needed
      while (
        animationLetterIndex >= TestWords.words.get(animationWordIndex).length
      ) {
        animationLetterIndex -= TestWords.words.get(animationWordIndex).length;
        animationWordIndex++;
      }

      let currentWord;
      let currentLetter;
      let newTop: number | undefined = undefined;
      let newLeft: number | undefined = undefined;
      try {
        const newIndex =
          animationWordIndex -
          (TestWords.words.currentIndex - TestUI.currentWordElementIndex);
        currentWord = <HTMLElement>(
          document.querySelectorAll("#words .word")[newIndex]
        );
        if (animationLetterIndex === -1) {
          currentLetter = <HTMLElement>(
            currentWord.querySelectorAll("letter")[0]
          );
        } else {
          currentLetter = <HTMLElement>(
            currentWord.querySelectorAll("letter")[animationLetterIndex]
          );
        }

        const currentLetterHeight = $(currentLetter).height(),
          currentLetterWidth = $(currentLetter).width(),
          caretWidth = this.element.width();

        if (
          currentLetterHeight === undefined ||
          currentLetterWidth === undefined ||
          caretWidth === undefined
        ) {
          throw ``;
        }

        newTop =
          currentLetter.offsetTop -
          Config.fontSize * convertRemToPixels(1) * 0.1;
        if (animationLetterIndex === -1) {
          newLeft = currentLetter.offsetLeft;
        } else {
          newLeft =
            currentLetter.offsetLeft + currentLetterWidth - caretWidth / 2;
        }
        this.element.removeClass("hidden");
      } catch (e) {
        this.element.addClass("hidden");
      }

      const currentTop = this.element[0].offsetTop;

      if (newTop !== undefined) {
        const smoothlinescroll = $("#words .smoothScroller").height() ?? 0;

        this.element.css({
          top: newTop - smoothlinescroll,
        });

        //check if new top is greater or smaller than current top (within margin)

        if (Config.smoothCaret) {
          if (
            currentWord &&
            currentTop !== undefined &&
            (newTop < currentTop - 10 || newTop > currentTop + 10)
          ) {
            let left: number;
            if (newTop < currentTop - 10) {
              left = currentWord.offsetLeft + currentWord.offsetWidth;
            } else {
              left = currentWord.offsetLeft;
            }

            this.element.stop(true, false).animate(
              {
                left,
              },
              SlowTimer.get() ? 0 : 125,
              "linear",
              () => {
                if (!this.element || !newLeft || !newTop) {
                  return;
                }
                this.element.stop(true, false).animate(
                  {
                    left: newLeft,
                  },
                  SlowTimer.get() ? 0 : animationDuration - 125,
                  "linear"
                );
              }
            );
          } else {
            this.element.stop(true, false).animate(
              {
                left: newLeft,
              },
              SlowTimer.get() ? 0 : animationDuration,
              "linear"
            );
          }
        } else {
          this.element.stop(true, false).animate(
            {
              left: newLeft,
            },
            0,
            "linear"
          );
        }
      }
    } catch (e) {
      console.error(
        `Error updating tribe caret for socket id ${this.socketId}: ${e}`
      );
      this.destroy();
    }
  }

  async changeColor(color: keyof MonkeyTypes.ThemeColors): Promise<void> {
    if (!this.element) return;
    const colorHex = await ThemeColors.get(color);
    this.element.css({
      background: colorHex,
    });
  }

  lineJump(offset: number, withAnimation: boolean): void {
    if (!this.element) return;
    if (withAnimation) {
      this.element.stop(true, false).animate(
        {
          top: (<HTMLElement>this.element[0])?.offsetTop - offset,
        },
        SlowTimer.get() ? 0 : 125
      );
    } else {
      this.element.css({
        top: (<HTMLElement>this.element[0]).offsetTop - offset,
      });
    }
  }
}

export function init(): void {
  if (Config.tribeCarets === "off") return;
  const room = getRoom();
  if (!room) return;
  for (const socketId of Object.keys(room.users)) {
    if (socketId === tribeSocket.getId()) continue;

    const name = room.users[socketId].name;

    carets[socketId] = new TribeCaret(socketId, 0, -1, name);
  }
}

export function updateAndAnimate(
  data: Record<string, TribeTypes.UserProgress>
): void {
  for (const socketId of Object.keys(data)) {
    if (!carets[socketId]) continue;
    carets[socketId].updatePosition(
      data[socketId].wordIndex,
      data[socketId].letterIndex
    );
    carets[socketId].animate(getRoom()?.updateRate ?? 500);
  }
}

export function destroy(socketId: string): void {
  if (carets[socketId]) {
    carets[socketId].destroy();
    delete carets[socketId];
  }
}

export function changeColor(
  socketId: string,
  color: keyof MonkeyTypes.ThemeColors
): void {
  if (carets[socketId]) {
    carets[socketId].changeColor(color);
  }
}

export function destroyAll(): void {
  for (const socketId of Object.keys(carets)) {
    carets[socketId].destroy();
    delete carets[socketId];
  }
}

export function lineJump(offset: number, withAnimation: boolean): void {
  for (const socketId of Object.keys(carets)) {
    carets[socketId].lineJump(offset, withAnimation);
  }
}

LineJumpEvent.subscribe((wordHeight: number) => {
  lineJump(wordHeight, Config.smoothLineScroll);
});

ConfigEvent.subscribe((key, value, _nosave, previousValue) => {
  if (key !== "tribeCarets") return;
  if (previousValue === value) return;

  if (value === "off") destroyAll();
  if (previousValue === "off") {
    init();
  }
  if (
    (previousValue === "on" && value === "noNames") ||
    (value === "on" && previousValue === "noNames")
  ) {
    for (const socketId of Object.keys(carets)) {
      carets[socketId].setNameVisibility(Config.tribeCarets === "on");
    }
  }
});
