export function cookie(
  name: string,
  value?: string | number,
  time?: number,
): string {
  if (value === undefined) {
    const arr = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]*)(;|$)"),
    );
    if (arr != null) {
      return unescape(arr[2]);
    }
    return "";
  } else {
    if (!time) time = 365;
    const exp = new Date();
    exp.setTime(exp.getTime() + time * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value.toString()) + ";expires=" +
      exp.toUTCString();
    return "";
  }
}
