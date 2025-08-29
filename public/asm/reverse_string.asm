; Reverse String - Reverse a null-terminated string in place
; String address in R0, result length in R1
.DATA
message: .STRING "Hello World"
.TEXT
start:
    LEA R0, message    ; R0 = string address
    MOV R1, R0         ; R1 = copy of string address
    ; Find string length
find_end:
    LOAD R2, [R1]      ; Load current character
    AND R2, #255       ; Mask to get only the low byte
    CMP R2, #0         ; Check if null terminator
    JZ found_end       ; Jump if end of string
    INC R1             ; Move to next character
    JMP find_end       ; Continue searching
found_end:
    DEC R1             ; R1 now points to last character
    ; R0 = start, R1 = end, now reverse
reverse_loop:
    CMP R0, R1         ; Check if pointers have met/crossed
    JGE done           ; If start >= end, we're done
    ; Swap characters at R0 and R1
    LOAD R2, [R0]      ; Load char from start
    AND R2, #255       ; Mask to byte
    LOAD R3, [R1]      ; Load char from end  
    AND R3, #255       ; Mask to byte
    STORE [R0], R3     ; Store end char at start
    STORE [R1], R2     ; Store start char at end
    INC R0             ; Move start pointer forward
    DEC R1             ; Move end pointer backward
    JMP reverse_loop   ; Continue reversing
done:
    LEA R0, message    ; R0 = address of reversed string
    MOV R1, R0         ; R1 = string address for printing
    SYS #2             ; Print the reversed string
    HALT               ; Stop execution
; Expected result: "dlroW olleH" (Hello World reversed)