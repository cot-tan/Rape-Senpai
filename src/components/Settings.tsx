// deno-lint-ignore-file jsx-no-useless-fragment
import { useState } from "react";
import { GameMode, SoundType } from "../constants.ts";
import "./Settings.css";

export const Settings = ({
  mode,
  changeMode,
  I18N,
  changeSoundMode,
  soundMode,
  handleSoundUpload,
  resetSound,
  gameSettingNum,
  setColumn,
  columns,
  setGameSettingNum,
  handleClickBeforeImage,
  resetClickBeforeImage,
  handleClickAfterImage,
  resetClickAfterImage,
  setClickAfterStyle,
  setClickBeforeStyle
}: {
  mode: GameMode;
  changeMode: (newMode: GameMode) => void;
  I18N: { [key: string]: string };
  changeSoundMode: () => void;
  soundMode: "on" | "off";
  handleSoundUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    soundType: SoundType,
  ) => void;
  resetSound: (SoundType: SoundType) => void;
  gameSettingNum: number;
  handleClickBeforeImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  columns: number;
  resetClickBeforeImage: () => void;
  handleClickAfterImage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetClickAfterImage: () => void;
  setColumn: React.Dispatch<React.SetStateAction<number>>;
  setGameSettingNum: React.Dispatch<React.SetStateAction<number>>;
  setClickAfterStyle: React.Dispatch<React.SetStateAction<string>>
  setClickBeforeStyle: React.Dispatch<React.SetStateAction<string>>
}) => {
  const [ActiveMenu, setActiveMenu] = useState<
    "General" | "Appearance" | "Advanced" | null
  >("General");

  return (
    <div className="container">
      <h1 className="Title">
        {I18N["game-title"]}
      </h1>
      <div className="card">
        <button
          type="button"
          onClick={() =>
            setActiveMenu((prev) => prev === "General" ? null : "General")}
          className="prepend"
        >
          <div>General</div>
        </button>
        {ActiveMenu === "General"
          ? (
            <div className="cardItem">
              <div className="Tab">
                <button
                  type="button"
                  onClick={() => changeMode("NORMAL")}
                  style={mode === "NORMAL"
                    ? { userSelect: "none", opacity: .3 }
                    : {}}
                >
                  {I18N["normal"]}
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("ENDLESS")}
                  style={mode === "ENDLESS"
                    ? { userSelect: "none", opacity: .3 }
                    : {}}
                >
                  {I18N["endless"]}
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("PRACTICE")}
                  style={mode === "PRACTICE"
                    ? { userSelect: "none", opacity: .3 }
                    : {}}
                >
                  {I18N["practice"]}
                </button>
              </div>
              <div className="input-group">
                <div>Sound</div>
                <button
                  type="button"
                  onClick={() => changeSoundMode()}
                >
                  {I18N[`sound-${soundMode}` as keyof typeof I18N]}
                </button>
              </div>
            </div>
          )
          : <></>}
      </div>
      <div className="card">
        <button
          type="button"
          className="prepend"
          onClick={() =>
            setActiveMenu((prev) =>
              prev === "Appearance" ? null : "Appearance"
            )}
        >
          <div>Appearance</div>
        </button>
        {ActiveMenu === "Appearance"
          ? (
            <div className="cardItem">
              <div className="input-group file">
                <div className="prepend">
                  クリック前画像
                </div>
                <input
                  type="file"
                  id="click-before-image"
                  className="form-control file"
                  accept="image/*"
                  onChange={handleClickBeforeImage}
                />
                <div className="Tab">
                  <button
                    type="button"
                    onClick={resetClickBeforeImage}
                  >
                    リセット
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClickBeforeStyle("")
                    }
                    }
                  >
                    削除
                  </button>
                  
                </div>
              </div>
              <div className="input-group file">
                <div className="prepend">
                  クリック後画像
                </div>
                <input
                  type="file"
                  id="click-after-image"
                  className="form-control file"
                  accept="image/*"
                  onChange={handleClickAfterImage}
                />
                <div className="Tab">
                  <button
                    type="button"
                    onClick={resetClickAfterImage}
                  >
                    リセット
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClickAfterStyle("")
                    }
                    }
                  >
                    削除
                  </button>
                  
                </div>
              </div>
              <div className="input-group file">
                <div className="prepend col-2">
                  {I18N["tap-sound"]}
                </div>
                <input
                  type="file"
                  id="tap-sound"
                  className="form-control file"
                  accept="audio/*"
                  onChange={(e) => handleSoundUpload(e, "tap")}
                />
                <button
                  type="button"
                  onClick={() => resetSound("tap")}
                >
                  リセット
                </button>
              </div>
              <div className="input-group file">
                <div className="prepend col-2">
                  {I18N["error-sound"]}
                </div>
                <input
                  type="file"
                  id="err-sound"
                  className="form-control file"
                  accept="audio/*"
                  onChange={(e) => handleSoundUpload(e, "err")}
                />
                <button
                  type="button"
                  onClick={() => resetSound("err")}
                >
                  リセット
                </button>
              </div>
              <div className="input-group">
                <div className="prepend col-2">
                  {I18N["end-sound"]}
                </div>
                <input
                  type="file"
                  id="end-sound"
                  className="form-control file"
                  accept="audio/*"
                  onChange={(e) => handleSoundUpload(e, "end")}
                />
                <button
                  type="button"
                  onClick={() => resetSound("end")}
                >
                  リセット
                </button>
              </div>
            </div>
          )
          : <></>}
      </div>

      <div className="card">
        <button
          type="button"
          onClick={() =>
            setActiveMenu((prev) => prev === "Advanced" ? null : "Advanced")}
          className="prepend"
        >
          <div>Advanced</div>
        </button>
        {ActiveMenu === "Advanced"
          ? (
            <div className="cardItem">
              <div className="input-group">
                <div className="prepend col-2">
                  {I18N["key"]}
                </div>
                <input
                  type="text"
                  id="keyboard"
                  className="form-control"
                  maxLength={4}
                  placeholder={I18N["default-dfjk"]}
                />
              </div>
              <div className="input-group">
                <div className="prepend col-2">
                  {I18N["time"]}
                </div>
                <div>{gameSettingNum}</div>
                <div className="Tab">
                  <button
                    type="button"
                    onClick={() =>
                      setGameSettingNum((prev) => prev++ < 60 ? prev++ : 60)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGameSettingNum((prev) => prev-- > 1 ? prev-- : 1)}
                  >
                    -
                  </button>
                </div>
              </div>
              <div className="input-group">
                <div className="input-group-prepend">
                  Columns
                </div>
                <div>{columns}</div>
                <div className="Tab">
                  <button
                    type="button"
                    onClick={() => setColumn((prev) => prev++ < 8 ? prev++ : 8)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setColumn((prev) => prev-- > 1 ? prev-- : 1)}
                  >
                    -
                  </button>
                </div>
              </div>
            </div>
          )
          : <></>}
      </div>
    </div>
  );
};

