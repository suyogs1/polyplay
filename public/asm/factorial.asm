; Factorial - Calculate factorial using recursive calls and stack
; Calculate factorial of N (stored in data section)
; Result stored in R0
.DATA
number: .WORD 5        ; Calculate factorial of 5
.TEXT
start:
    LOAD R0, [number]  ; Load N into R0
    CALL factorial     ; Call factorial function
    SYS #1             ; Print result
    HALT               ; Stop execution

factorial:
    ; Function: factorial(n) -> n!
    ; Input: R0 = n
    ; Output: R0 = n!
    ; Uses stack to preserve registers
    PUSH R1            ; Save R1
    PUSH R2            ; Save R2
    
    ; Base case: if n <= 1, return 1
    CMP R0, #1
    JLE base_case
    
    ; Recursive case: n * factorial(n-1)
    MOV R1, R0         ; Save n in R1
    DEC R0             ; R0 = n-1
    CALL factorial     ; R0 = factorial(n-1)
    MUL R0, R1         ; R0 = n * factorial(n-1)
    JMP factorial_end
    
base_case:
    MOV R0, #1         ; Return 1 for base case
    
factorial_end:
    POP R2             ; Restore R2
    POP R1             ; Restore R1
    RET                ; Return to caller

; Expected result: R0 = 120 (5! = 5*4*3*2*1 = 120)